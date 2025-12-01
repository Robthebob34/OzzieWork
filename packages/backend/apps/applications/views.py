"""Application API views."""
from decimal import Decimal, InvalidOperation
from io import BytesIO
import re

from django.db import transaction
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.core.files.base import ContentFile
from django.template.loader import render_to_string
from django.conf import settings
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from xhtml2pdf import pisa

from apps.messaging.models import Conversation, Message
from apps.users.models import TravellerDocument
from apps.users.utils import (
    traveller_compliance_gaps,
    ensure_employer_not_suspended,
    unsuspend_employer_if_settled,
    SUSPENSION_MESSAGE,
)

from .models import Application, JobOffer, Timesheet, TimesheetEntry, Payslip
from .serializers import ApplicationSerializer, JobOfferSerializer, TimesheetSerializer, PayslipSerializer


TWOPLACES = Decimal("0.01")


def ensure_timesheet_for_offer(offer: JobOffer) -> Timesheet:
    timesheet, _created = Timesheet.objects.get_or_create(offer=offer)
    return timesheet


def _format_user_name(user) -> str:
    return user.get_full_name() or user.email


def _format_user_address(user) -> str:
    parts = [
        (user.address_street or "").strip(),
        " ".join(filter(None, [(user.address_city or "").strip(), (user.address_state or "").strip()])).strip(),
        (user.address_postcode or "").strip(),
    ]
    cleaned = [part for part in parts if part]
    return ", ".join(cleaned)


def send_timesheet_message(offer: JobOffer, sender, body: str | None = None) -> None:
    timesheet = ensure_timesheet_for_offer(offer)
    employer_user = offer.job.employer.user
    conversation, _ = Conversation.objects.get_or_create(
        employer=employer_user,
        traveller=offer.traveller,
        job=offer.job,
    )
    totals = timesheet.entries.aggregate(total_hours=Sum("hours_worked"))
    total_hours = totals.get("total_hours") or Decimal("0")
    metadata = {
        "kind": "timesheet",
        "offer_id": offer.id,
        "application_id": offer.application_id,
        "status": timesheet.status,
        "entry_count": timesheet.entries.count(),
        "total_hours": str(total_hours),
    }
    message_body = body or "Timesheet activity recorded."
    message = Message.objects.create(
        conversation=conversation,
        sender=sender,
        body=message_body,
        is_system=True,
        message_type="timesheet",
        metadata=metadata,
    )
    conversation.last_message_at = message.created_at
    conversation.save(update_fields=["last_message_at", "updated_at"])


def send_payslip_message(payslip: Payslip, sender, body: str | None = None) -> None:
    employer_user = payslip.offer.job.employer.user
    conversation, _ = Conversation.objects.get_or_create(
        employer=employer_user,
        traveller=payslip.traveller,
        job=payslip.offer.job,
    )
    metadata = {
        "kind": "payslip",
        "payslip_id": payslip.id,
        "hour_count": str(payslip.hour_count),
        "gross_amount": str(payslip.gross_amount),
        "commission_amount": str(payslip.commission_amount),
        "tax_withheld": str(payslip.tax_withheld),
        "net_payment": str(payslip.net_payment),
        "rate_amount": str(payslip.rate_amount),
        "rate_currency": payslip.rate_currency,
    }
    message_body = body or "Employer initiated a payout for approved hours."
    message = Message.objects.create(
        conversation=conversation,
        sender=sender,
        body=message_body,
        is_system=True,
        message_type="payslip",
        metadata=metadata,
    )
    conversation.last_message_at = message.created_at
    conversation.save(update_fields=["last_message_at", "updated_at"])


def render_payslip_pdf(payslip: Payslip) -> bytes:
    html = render_to_string("payslips/payslip.html", {"payslip": payslip})
    pdf_io = BytesIO()
    pisa_status = pisa.CreatePDF(html, dest=pdf_io)
    if pisa_status.err:
        raise ValidationError("Unable to generate payslip PDF.")
    return pdf_io.getvalue()


def _clean_digits(value: str) -> str:
    return re.sub(r"\D", "", value or "")


def _normalize_bsb(raw_value: str, label: str) -> str:
    digits = _clean_digits(raw_value)
    if len(digits) != 6:
        raise ValidationError({"detail": f"{label} needs a valid 6-digit BSB."})
    return digits


def _normalize_account(raw_value: str, label: str) -> str:
    digits = _clean_digits(raw_value)
    if not 1 <= len(digits) <= 9:
        raise ValidationError({"detail": f"{label} needs a bank account number between 1 and 9 digits."})
    return digits


def _format_bsb_display(digits: str) -> str:
    return f"{digits[:3]}-{digits[3:]}"


def _require_bank_details(user, label: str) -> dict:
    missing = []
    bank_name = (user.bank_name or "").strip()
    bank_bsb = (user.bank_bsb or "").strip()
    bank_account_number = (user.bank_account_number or "").strip()
    if not bank_name:
        missing.append("bank name")
    if not bank_bsb:
        missing.append("BSB")
    if not bank_account_number:
        missing.append("account number")
    if missing:
        raise ValidationError({"detail": f"{label} missing bank details: {', '.join(missing)}"})
    bsb_digits = _normalize_bsb(bank_bsb, label)
    account_digits = _normalize_account(bank_account_number, label)
    return {
        "account_name": _format_user_name(user),
        "bank_name": bank_name,
        "bsb_digits": bsb_digits,
        "bsb_display": _format_bsb_display(bsb_digits),
        "account_number": account_digits,
    }


def _ozziework_bank_details() -> dict:
    bsb_digits = _normalize_bsb(settings.OZZIEWORK_BANK_BSB, "OzzieWork")
    return {
        "account_name": settings.OZZIEWORK_BANK_NAME,
        "bank_name": settings.OZZIEWORK_BANK_NAME,
        "bsb_digits": bsb_digits,
        "bsb_display": _format_bsb_display(bsb_digits),
        "account_number": _normalize_account(settings.OZZIEWORK_BANK_ACCOUNT, "OzzieWork"),
    }


def _format_amount_cents(amount: Decimal) -> int:
    cents = int((amount.quantize(TWOPLACES) * 100).to_integral_value())
    return cents


def _build_aba_file(
    *,
    payslip: Payslip,
    employer_bank: dict,
    traveller_bank: dict,
    ozzie_bank: dict,
    commission_amount: Decimal,
    net_payment: Decimal,
    tax_withheld: Decimal,
) -> dict:
    processing_date = timezone.now()
    lodgement_reference = f"PAYS{payslip.id}"[:18]
    trace_bsb = employer_bank["bsb_digits"]
    trace_account = employer_bank["account_number"]
    company_name = (payslip.employer_name or employer_bank["account_name"])[:20]

    def descriptive_record() -> str:
        line = (
            "0"
            + " "
            + "01"
            + f"{company_name:<20}"
            + f"{lodgement_reference[:12]:<12}"
            + f"{_format_bsb_display(trace_bsb)}"
            + f"{trace_account:<9}"
            + processing_date.strftime("%d%m%y")
            + " " * 24
            + "AUD"
            + " " * 9
        )
        return line.ljust(120)

    def detail_record(recipient: dict, amount: Decimal, description: str) -> tuple[str, dict]:
        amount_cents = _format_amount_cents(amount)
        line = (
            "1"
            + f"{recipient['bsb_display']}"
            + f"{recipient['account_number']:<9}"
            + " "
            + "50"
            + f"{amount_cents:010d}"
            + f"{recipient['account_name'][:32]:<32}"
            + f"{description[:18]:<18}"
            + f"{_format_bsb_display(trace_bsb)}"
            + f"{trace_account:<9}"
            + f"{company_name[:16]:<16}"
        )
        return line.ljust(120), {
            "account_name": recipient["account_name"],
            "bsb": recipient["bsb_display"],
            "account_number": recipient["account_number"],
            "amount": str(amount.quantize(TWOPLACES)),
            "description": description,
        }

    def file_total_record(total_amount_cents: int, detail_count: int) -> str:
        line = (
            "7"
            + " " * 7
            + f"{total_amount_cents:010d}"
            + f"{detail_count:06d}"
            + " " * 40
            + "000000"
        )
        return line.ljust(120)

    detail_specs = [
        (ozzie_bank, commission_amount, "OZZIEWORK COMM"),
        (traveller_bank, net_payment, "NET PAYMENT"),
        (employer_bank, tax_withheld, "WH TAX"),
    ]

    lines = [descriptive_record()]
    metadata_entries = []
    total_cents = 0
    for recipient, amount, description in detail_specs:
        if amount <= Decimal("0"):
            continue
        record_line, metadata = detail_record(recipient, amount, description)
        lines.append(record_line)
        metadata_entries.append(metadata)
        total_cents += _format_amount_cents(amount)
    lines.append(file_total_record(total_cents, len(metadata_entries)))
    content = "\n".join(lines) + "\n"
    return {
        "content": content,
        "metadata": {
            "records": metadata_entries,
            "total_amount": str((commission_amount + net_payment + tax_withheld).quantize(TWOPLACES)),
            "generated_at": processing_date.isoformat(),
        },
    }


def send_application_card_message(application: Application) -> None:
    employer_user = application.job.employer.user
    conversation, _ = Conversation.objects.get_or_create(
        employer=employer_user,
        traveller=application.applicant,
        job=application.job,
    )
    applicant = application.applicant
    metadata = {
        "kind": "application_card",
        "application_id": application.id,
        "job_id": application.job_id,
        "job_title": application.job.title,
        "traveller_name": applicant.get_full_name() or applicant.email,
        "status": application.status,
        "cover_letter_preview": (application.cover_letter or "")[:200],
        "submitted_at": application.submitted_at.isoformat() if application.submitted_at else None,
    }
    message_body = f"{metadata['traveller_name']} applied for {application.job.title}."
    message = Message.objects.create(
        conversation=conversation,
        sender=applicant,
        body=message_body,
        is_system=True,
        message_type="application_card",
        metadata=metadata,
    )
    conversation.last_message_at = message.created_at
    conversation.save(update_fields=["last_message_at", "updated_at"])


class ApplicationAccessMixin:
    def _get_application(self, pk, user, require_employer=False):
        application = get_object_or_404(
            Application.objects.select_related("job", "job__employer", "job__employer__user", "applicant"), pk=pk
        )
        job_owner = application.job.employer.user
        if require_employer and user != job_owner:
            raise PermissionDenied("Only the job owner may create offers.")
        if user not in {job_owner, application.applicant} and not user.is_staff:
            raise PermissionDenied("You do not have access to this application.")
        return application


class ApplicationListCreateView(generics.ListCreateAPIView):
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Application.objects.select_related("job", "applicant", "job__employer__user")

        if user.is_staff:
            pass
        elif getattr(user, "is_employer", False):
            ensure_employer_not_suspended(user)
            queryset = queryset.filter(job__employer__user=user)
        else:
            queryset = queryset.filter(applicant=user)

        job_id = self.request.query_params.get("job_id")
        if job_id:
            try:
                queryset = queryset.filter(job_id=int(job_id))
            except (TypeError, ValueError):
                queryset = queryset.none()

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if not getattr(user, "is_traveller", False):
            raise PermissionDenied("Only traveller accounts can apply to jobs.")

        missing = traveller_compliance_gaps(user)
        if missing:
            raise ValidationError(
                {
                    "detail": "Profil incomplet : complétez vos informations obligatoires avant de postuler.",
                    "missing_fields": missing,
                    "redirect_url": "/settings/profile",
                }
            )

        application = serializer.save(applicant=user)
        send_application_card_message(application)


class ApplicationDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated]
    queryset = Application.objects.select_related("job", "applicant")


class ApplicationOfferView(ApplicationAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def _sync_application_status(self, offer: JobOffer):
        status_map = {
            "pending": "offer_sent",
            "accepted": "offer_accepted",
            "declined": "offer_declined",
            "cancelled": "cancelled",
        }
        new_status = status_map.get(offer.status)
        if new_status and offer.application.status != new_status:
            offer.application.status = new_status
            offer.application.save(update_fields=["status", "updated_at"])

    def _send_offer_message(self, offer: JobOffer, sender, body=None):
        employer_user = offer.job.employer.user
        conversation, _ = Conversation.objects.get_or_create(
            employer=employer_user,
            traveller=offer.traveller,
            job=offer.job,
        )
        metadata = {
            "kind": "job_offer",
            "offer_id": offer.id,
            "application_id": offer.application_id,
            "job_id": offer.job_id,
            "job_title": offer.job.title,
            "employer_name": offer.employer.company_name
            or employer_user.get_full_name()
            or employer_user.email,
            "status": offer.status,
            "contract_type": offer.contract_type,
            "rate_type": offer.rate_type,
            "rate_amount": str(offer.rate_amount),
            "rate_currency": offer.rate_currency,
            "start_date": offer.start_date.isoformat(),
            "end_date": offer.end_date.isoformat() if offer.end_date else None,
            "accommodation_details": offer.accommodation_details,
        }
        message_body = body or f"{employer_user.get_full_name() or employer_user.email} sent a contract offer."
        message = Message.objects.create(
            conversation=conversation,
            sender=sender,
            body=message_body,
            is_system=True,
            message_type="job_offer",
            metadata=metadata,
        )
        conversation.last_message_at = message.created_at
        conversation.save(update_fields=["last_message_at", "updated_at"])

    def get(self, request, pk):
        application = self._get_application(pk, request.user)
        offer = getattr(application, "offer", None)
        if not offer:
            return Response({"detail": "No offer available."}, status=status.HTTP_404_NOT_FOUND)
        data = JobOfferSerializer(offer).data
        return Response(data)

    def post(self, request, pk):
        application = self._get_application(pk, request.user, require_employer=True)

        ensure_employer_not_suspended(request.user)
        if hasattr(application, "offer"):
            return Response(
                {"detail": "An offer already exists for this application."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if self._job_has_active_offer(application.job, exclude_application_id=application.id):
            return Response(
                {"detail": "Another active offer already exists for this job."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = JobOfferSerializer(data=request.data, context={"application": application})
        serializer.is_valid(raise_exception=True)
        offer = serializer.save()
        ensure_timesheet_for_offer(offer)
        self._sync_application_status(offer)
        self._send_offer_message(offer, sender=application.job.employer.user)
        return Response(JobOfferSerializer(offer).data, status=status.HTTP_201_CREATED)

    def patch(self, request, pk):
        application = self._get_application(pk, request.user)
        offer = getattr(application, "offer", None)
        if not offer:
            return Response({"detail": "No offer available."}, status=status.HTTP_404_NOT_FOUND)

        data = request.data or {}
        user = request.user

        if user == application.job.employer.user:
            ensure_employer_not_suspended(user)
            allowed_fields = {
                "start_date",
                "end_date",
                "rate_type",
                "rate_amount",
                "rate_currency",
                "accommodation_details",
                "notes",
                "status",
            }
            if "status" in data and data["status"] not in {"pending", "cancelled"}:
                return Response(
                    {"detail": "Employers can only cancel offers after sending."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif user == application.applicant:
            allowed_fields = {"status"}
            if data.get("status") not in {"accepted", "declined"}:
                return Response(
                    {"detail": "Travellers can only accept or decline offers."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            raise PermissionDenied("Not authorized to update this offer.")

        payload = {key: value for key, value in data.items() if key in allowed_fields}
        if not payload:
            return Response({"detail": "No valid fields provided."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = JobOfferSerializer(offer, data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        offer = serializer.save()
        ensure_timesheet_for_offer(offer)
        self._sync_application_status(offer)

        if "status" in payload:
            actor = "Employer" if user == application.job.employer.user else "Traveller"
            status_message = f"{actor} updated the contract status to {offer.status.replace('_', ' ').title()}."
            self._send_offer_message(offer, body=status_message, sender=user)

        return Response(JobOfferSerializer(offer).data)

    def _get_application(self, pk, user, require_employer=False):
        application = get_object_or_404(
            Application.objects.select_related("job", "job__employer", "job__employer__user", "applicant"), pk=pk
        )
        job_owner = application.job.employer.user
        if require_employer and user != job_owner:
            raise PermissionDenied("Only the job owner may create offers.")
        if user not in {job_owner, application.applicant} and not user.is_staff:
            raise PermissionDenied("You do not have access to this application.")
        return application

    def _job_has_active_offer(self, job, exclude_application_id=None):
        queryset = job.offers.filter(status__in=["pending", "accepted"])
        if exclude_application_id:
            queryset = queryset.exclude(application_id=exclude_application_id)
        return queryset.exists()


class EmployerWorkersView(generics.ListAPIView):
    serializer_class = JobOfferSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not getattr(user, "is_employer", False):
            raise PermissionDenied("Only employers can view workers.")
        return (
            JobOffer.objects.select_related("application", "job", "employer", "traveller")
            .prefetch_related("timesheet__entries")
            .filter(status="accepted", job__employer__user=user)
        )


class TravellerJobsView(generics.ListAPIView):
    serializer_class = JobOfferSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not getattr(user, "is_traveller", False):
            raise PermissionDenied("Only travellers can view accepted jobs.")
        return (
            JobOffer.objects.select_related("application", "job", "employer", "traveller")
            .prefetch_related("timesheet__entries")
            .filter(status="accepted", traveller=user)
        )


class TimesheetView(ApplicationAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        application = self._get_application(pk, request.user)
        offer = getattr(application, "offer", None)
        if not offer or offer.status != "accepted":
            raise NotFound("No accepted offer found for this application.")
        timesheet = ensure_timesheet_for_offer(offer)
        return Response(TimesheetSerializer(timesheet).data)

    @transaction.atomic
    def put(self, request, pk):
        application = self._get_application(pk, request.user)
        offer = getattr(application, "offer", None)
        if not offer or offer.status != "accepted":
            raise NotFound("No accepted offer found for this application.")
        if request.user != application.applicant:
            raise PermissionDenied("Only the traveller may update the timesheet entries.")

        timesheet = ensure_timesheet_for_offer(offer)

        payload = request.data or {}
        entries_payload = payload.get("entries")
        if entries_payload is None or not isinstance(entries_payload, list):
            return Response({"detail": "Entries payload is required."}, status=status.HTTP_400_BAD_REQUEST)

        existing_entries = {entry.entry_date: entry for entry in timesheet.entries.all()}
        seen_entry_dates = set()
        to_create: list[TimesheetEntry] = []
        to_update: list[TimesheetEntry] = []
        for entry in entries_payload:
            if not isinstance(entry, dict):
                return Response({"detail": "Invalid entry payload."}, status=status.HTTP_400_BAD_REQUEST)
            entry_date = parse_date(entry.get("entry_date"))
            if not entry_date:
                return Response({"detail": "Each entry requires a valid entry_date."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                hours_value = Decimal(str(entry.get("hours_worked")))
            except (InvalidOperation, TypeError):
                return Response({"detail": "Hours must be a numeric value."}, status=status.HTTP_400_BAD_REQUEST)
            if hours_value <= 0:
                return Response({"detail": "Hours must be greater than zero."}, status=status.HTTP_400_BAD_REQUEST)

            notes_value = entry.get("notes", "")
            existing = existing_entries.get(entry_date)
            seen_entry_dates.add(entry_date)

            if existing and existing.is_locked:
                if existing.hours_worked != hours_value or (existing.notes or "") != notes_value:
                    return Response(
                        {"detail": f"Hours for {entry_date.isoformat()} have already been approved and cannot be changed."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                continue

            if existing:
                existing.hours_worked = hours_value
                existing.notes = notes_value
                existing.is_locked = False
                to_update.append(existing)
            else:
                to_create.append(
                    TimesheetEntry(
                        timesheet=timesheet,
                        entry_date=entry_date,
                        hours_worked=hours_value,
                        notes=notes_value,
                        is_locked=False,
                    )
                )

        if to_create:
            TimesheetEntry.objects.bulk_create(to_create)
        for entry in to_update:
            entry.save(update_fields=["hours_worked", "notes", "is_locked"])

        for entry_date, entry in existing_entries.items():
            if entry.is_locked or entry_date in seen_entry_dates:
                continue
            entry.delete()

        traveller_notes = payload.get("traveller_notes")
        if traveller_notes is not None:
            timesheet.traveller_notes = traveller_notes

        if timesheet.status in {"submitted", "approved"}:
            timesheet.status = "draft"
            timesheet.submitted_at = None
            timesheet.approved_at = None

        timesheet.save(update_fields=["traveller_notes", "status", "submitted_at", "approved_at", "updated_at"])

        send_timesheet_message(offer, sender=request.user, body="Traveller updated the timesheet entries.")
        return Response(TimesheetSerializer(timesheet).data)


class TimesheetSubmitView(ApplicationAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        application = self._get_application(pk, request.user)
        offer = getattr(application, "offer", None)
        if not offer or offer.status != "accepted":
            raise NotFound("No accepted offer found for this application.")
        if request.user != application.applicant:
            raise PermissionDenied("Only the traveller may submit the timesheet.")

        timesheet = ensure_timesheet_for_offer(offer)
        pending_entries = timesheet.entries.filter(is_locked=False)
        if not pending_entries.exists():
            return Response({"detail": "Add at least one new entry before submitting."}, status=status.HTTP_400_BAD_REQUEST)
        if timesheet.status == "approved":
            return Response({"detail": "Timesheet already approved."}, status=status.HTTP_400_BAD_REQUEST)

        timesheet.status = "submitted"
        timesheet.submitted_at = timezone.now()
        timesheet.save(update_fields=["status", "submitted_at", "updated_at"])

        send_timesheet_message(offer, sender=request.user, body="Traveller submitted a timesheet for approval.")
        return Response(TimesheetSerializer(timesheet).data, status=status.HTTP_200_OK)


class TimesheetApproveView(ApplicationAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        application = self._get_application(pk, request.user)
        offer = getattr(application, "offer", None)
        if not offer or offer.status != "accepted":
            raise NotFound("No accepted offer found for this application.")
        if request.user != application.job.employer.user:
            raise PermissionDenied("Only the employer may approve the timesheet.")

        timesheet = ensure_timesheet_for_offer(offer)
        if timesheet.status != "submitted":
            return Response({"detail": "Only submitted timesheets can be approved."}, status=status.HTTP_400_BAD_REQUEST)

        pending_entries = timesheet.entries.filter(is_locked=False)
        if not pending_entries.exists():
            return Response({"detail": "No pending entries to approve."}, status=status.HTTP_400_BAD_REQUEST)

        pending_entries.update(is_locked=True)

        timesheet.status = "approved"
        timesheet.approved_at = timezone.now()

        employer_notes = request.data.get("employer_notes")
        if employer_notes is not None:
            timesheet.employer_notes = employer_notes

        timesheet.save(update_fields=["status", "approved_at", "employer_notes", "updated_at"])

        send_timesheet_message(offer, sender=request.user, body="Employer approved the submitted timesheet.")
        return Response(TimesheetSerializer(timesheet).data, status=status.HTTP_200_OK)

    def _sync_application_status(self, offer: JobOffer):
        status_map = {
            "pending": "offer_sent",
            "accepted": "offer_accepted",
            "declined": "offer_declined",
            "cancelled": "cancelled",
        }
        new_status = status_map.get(offer.status)
        if new_status and offer.application.status != new_status:
            offer.application.status = new_status
            offer.application.save(update_fields=["status", "updated_at"])

    def _send_offer_message(self, offer: JobOffer, sender, body=None):
        employer_user = offer.job.employer.user
        conversation, _ = Conversation.objects.get_or_create(
            employer=employer_user,
            traveller=offer.traveller,
            job=offer.job,
        )
        metadata = self._build_offer_metadata(offer)
        message_body = body or f"{employer_user.get_full_name() or employer_user.email} sent a contract offer."
        message = Message.objects.create(
            conversation=conversation,
            sender=sender,
            body=message_body,
            is_system=True,
            message_type="job_offer",
            metadata=metadata,
        )
        conversation.last_message_at = message.created_at
        conversation.save(update_fields=["last_message_at", "updated_at"])

    def _build_offer_metadata(self, offer: JobOffer):
        employer_user = offer.job.employer.user
        return {
            "kind": "job_offer",
            "offer_id": offer.id,
            "application_id": offer.application_id,
            "job_id": offer.job_id,
            "job_title": offer.job.title,
            "employer_name": offer.employer.company_name
            or employer_user.get_full_name()
            or employer_user.email,
            "status": offer.status,
            "contract_type": offer.contract_type,
            "rate_type": offer.rate_type,
            "rate_amount": str(offer.rate_amount),
            "rate_currency": offer.rate_currency,
            "start_date": offer.start_date.isoformat(),
            "end_date": offer.end_date.isoformat() if offer.end_date else None,
            "accommodation_details": offer.accommodation_details,
        }


class PayslipView(ApplicationAccessMixin, APIView):
    permission_classes = [IsAuthenticated]
    COMMISSION_RATE = Decimal("0.01")
    TAX_RATE = Decimal("0.15")

    @transaction.atomic
    def post(self, request, pk):
        application = self._get_application(pk, request.user, require_employer=True)
        offer = getattr(application, "offer", None)
        if not offer or offer.status != "accepted":
            return Response({"detail": "No accepted offer found for this application."}, status=status.HTTP_400_BAD_REQUEST)

        timesheet = ensure_timesheet_for_offer(offer)
        if timesheet.status != "approved":
            return Response({"detail": "Only approved timesheets can be paid."}, status=status.HTTP_400_BAD_REQUEST)

        pending_entries = list(
            TimesheetEntry.objects.select_for_update().filter(timesheet=timesheet, is_locked=True, is_paid=False)
        )
        if not pending_entries:
            return Response({"detail": "No approved unpaid hours available."}, status=status.HTTP_400_BAD_REQUEST)

        total_hours = sum((entry.hours_worked for entry in pending_entries), Decimal("0"))
        if total_hours <= 0:
            return Response({"detail": "Invalid hour total for payment."}, status=status.HTTP_400_BAD_REQUEST)

        rate_amount = offer.rate_amount
        gross_amount = (rate_amount * total_hours).quantize(TWOPLACES)
        commission_amount = (gross_amount * self.COMMISSION_RATE).quantize(TWOPLACES)
        net_before_tax = (gross_amount - commission_amount).quantize(TWOPLACES)
        tax_withheld = (net_before_tax * self.TAX_RATE).quantize(TWOPLACES)
        net_payment = (net_before_tax - tax_withheld).quantize(TWOPLACES)
        super_amount = (gross_amount * Decimal("0.11")).quantize(TWOPLACES)

        employer_user = offer.job.employer.user
        employer_bank = _require_bank_details(employer_user, "Employer")
        traveller_bank = _require_bank_details(offer.traveller, "Traveller")
        ozzie_bank = _ozziework_bank_details()

        metadata = {
            "entries": [
                {
                    "entry_date": entry.entry_date.isoformat(),
                    "hours_worked": str(entry.hours_worked),
                }
                for entry in pending_entries
            ],
            "commission_rate": str(self.COMMISSION_RATE),
            "tax_rate": str(self.TAX_RATE),
        }

        payslip = Payslip.objects.create(
            timesheet=timesheet,
            offer=offer,
            employer=offer.employer,
            traveller=offer.traveller,
            hour_count=total_hours,
            rate_amount=rate_amount,
            rate_currency=offer.rate_currency,
            gross_amount=gross_amount,
            commission_amount=commission_amount,
            net_before_tax=net_before_tax,
            tax_withheld=tax_withheld,
            net_payment=net_payment,
            super_amount=super_amount,
            pay_period_start=timesheet.entries.order_by("entry_date").first().entry_date if timesheet.entries.exists() else None,
            pay_period_end=timesheet.entries.order_by("-entry_date").first().entry_date if timesheet.entries.exists() else None,
            payment_method="bank_transfer",
            employer_name=_format_user_name(employer_user),
            employer_address=_format_user_address(employer_user),
            employer_abn=offer.employer.abn,
            traveller_name=_format_user_name(offer.traveller),
            traveller_address=_format_user_address(offer.traveller),
            traveller_tfn=offer.traveller.tfn,
            metadata=metadata,
        )

        pdf_bytes = render_payslip_pdf(payslip)
        filename = f"payslip-{payslip.id}.pdf"
        payslip.pdf_file.save(filename, ContentFile(pdf_bytes), save=True)

        aba_payload = _build_aba_file(
            payslip=payslip,
            employer_bank=employer_bank,
            traveller_bank=traveller_bank,
            ozzie_bank=ozzie_bank,
            commission_amount=commission_amount,
            net_payment=net_payment,
            tax_withheld=tax_withheld,
        )
        aba_filename = f"payslip-{payslip.id}.aba"
        payslip.aba_file.save(aba_filename, ContentFile(aba_payload["content"].encode("ascii")), save=False)
        payslip.aba_metadata = aba_payload["metadata"]
        payslip.aba_generated_at = timezone.now()
        payslip.instructions_status = "instructions_generated"
        payslip.save(update_fields=["aba_metadata", "aba_generated_at", "instructions_status", "aba_file"])

        TravellerDocument.objects.create(
            owner=offer.traveller,
            uploaded_by=request.user,
            title=f"Payslip {payslip.created_at.date().isoformat()}",
            category="payslip_pdf",
            file=payslip.pdf_file,
            mime_type="application/pdf",
            size_bytes=payslip.pdf_file.size if payslip.pdf_file else 0,
            source_type="payslip",
            source_id=payslip.id,
        )

        TravellerDocument.objects.create(
            owner=employer_user,
            uploaded_by=request.user,
            title=f"Payslip ABA {payslip.created_at.date().isoformat()}",
            category="payslip_aba",
            file=payslip.aba_file,
            mime_type="text/plain",
            size_bytes=payslip.aba_file.size if payslip.aba_file else 0,
            source_type="payslip",
            source_id=payslip.id,
        )

        TimesheetEntry.objects.filter(id__in=[entry.id for entry in pending_entries]).update(
            is_paid=True, payment_status="instructions_generated"
        )

        send_payslip_message(payslip, sender=request.user, body="Employer generated a payslip for the approved hours.")

        serializer = PayslipSerializer(payslip, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def get(self, request, pk):
        application = self._get_application(pk, request.user)
        offer = getattr(application, "offer", None)
        if not offer:
            raise NotFound("No offer available for this application.")
        payslip = offer.payslips.order_by("-created_at").first()
        if not payslip:
            return Response({"detail": "No payslip available."}, status=status.HTTP_404_NOT_FOUND)
        serializer = PayslipSerializer(payslip, context={"request": request})
        return Response(serializer.data)


class PayslipInstructionConfirmView(ApplicationAccessMixin, APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        application = self._get_application(pk, request.user, require_employer=True)
        offer = getattr(application, "offer", None)
        if not offer:
            return Response({"detail": "No offer available for this application."}, status=status.HTTP_404_NOT_FOUND)
        payslip = offer.payslips.order_by("-created_at").first()
        if not payslip:
            return Response({"detail": "No payslip available."}, status=status.HTTP_404_NOT_FOUND)
        if payslip.instructions_status not in {"instructions_generated", "awaiting_bank_import"}:
            return Response({"detail": "No instructions awaiting confirmation."}, status=status.HTTP_400_BAD_REQUEST)

        payslip.instructions_status = "completed"
        payslip.status = "completed"
        payslip.offer.application.last_paid_at = timezone.now()
        payslip.offer.application.save(update_fields=["last_paid_at", "updated_at"])
        payslip.save(update_fields=["instructions_status", "status", "updated_at"])
        payslip.timesheet.entries.filter(payment_status__in=["instructions_generated", "awaiting_bank_import"]).update(
            payment_status="paid"
        )

        send_payslip_message(
            payslip,
            sender=request.user,
            body=(
                "✅ Votre paie pour la période "
                f"{payslip.pay_period_start or ''} - {payslip.pay_period_end or ''} a été confirmée par "
                f"{payslip.employer_name or 'votre employeur'}."
            ),
        )

        serializer = PayslipSerializer(payslip, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)
