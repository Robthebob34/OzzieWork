"""Mark overdue payslips and suspend delinquent employers."""
from __future__ import annotations

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.applications.models import Payslip


class Command(BaseCommand):
    help = "Detect overdue payslips and suspend employers with unpaid instructions."

    def add_arguments(self, parser):  # pragma: no cover - argument wiring
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Only report what would change without writing to the database.",
        )

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", False)
        cutoff = timezone.now().date() - timedelta(days=7)

        overdue_qs = (
            Payslip.objects.select_related("employer", "employer__user")
            .filter(
                status__in=["processing", "failed"],
                instructions_status__in=["instructions_generated", "awaiting_bank_import"],
                pay_period_end__lt=cutoff,
            )
            .order_by("pay_period_end")
        )

        processed = 0
        suspended_employers = set()

        for payslip in overdue_qs:
            with transaction.atomic():
                if not dry_run:
                    payslip.status = "overdue"
                    payslip.save(update_fields=["status", "updated_at"])
                self.stdout.write(
                    self.style.WARNING(
                        f"Payslip #{payslip.id} marked overdue (employer={payslip.employer_id}, traveller={payslip.traveller_id})."
                    )
                processed += 1

                employer = payslip.employer
                if employer.is_suspended:
                    continue
                if dry_run:
                    suspended_employers.add(employer.pk)
                    continue
                employer.is_suspended = True
                employer.save(update_fields=["is_suspended", "updated_at"] if hasattr(employer, "updated_at") else ["is_suspended"])
                suspended_employers.add(employer.pk)
                self.stdout.write(
                    self.style.ERROR(
                        f"Employer #{employer.pk} suspended due to overdue payslip #{payslip.id}."
                    )
                )

        if not processed:
            self.stdout.write(self.style.SUCCESS("No overdue payslips detected."))
        else:
            msg = f"Identified {processed} overdue payslips."
            if dry_run:
                msg += " (dry-run: no changes applied)"
            self.stdout.write(self.style.SUCCESS(msg))

        if suspended_employers:
            employers = ", ".join(str(pk) for pk in sorted(suspended_employers))
            self.stdout.write(self.style.WARNING(f"Suspended employers: {employers}"))
        elif processed:
            self.stdout.write(self.style.SUCCESS("No new employer suspensions needed."))
