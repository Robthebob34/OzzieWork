"""Application domain models."""
import uuid

from django.db import models
from django.conf import settings


class Application(models.Model):
    """Represents a traveller applying for a job."""

    STATUS_CHOICES = [
        ("submitted", "Submitted"),
        ("review", "In Review"),
        ("interview", "Interview"),
        ("offer_sent", "Offer Sent"),
        ("offer_accepted", "Offer Accepted"),
        ("offer_declined", "Offer Declined"),
        ("hired", "Hired"),
        ("rejected", "Rejected"),
        ("cancelled", "Cancelled"),
    ]

    job = models.ForeignKey("jobs.Job", on_delete=models.CASCADE, related_name="applications")
    applicant = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="applications"
    )
    cover_letter = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="submitted")
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["job", "applicant"], name="unique_job_applicant_application")
        ]

    def __str__(self) -> str:  # pragma: no cover - repr helper
        return f"{self.applicant} -> {self.job}"


class JobOffer(models.Model):
    """Formal contract offer tied to an application."""

    CONTRACT_TYPE_CHOICES = [("casual", "Casual")]

    RATE_TYPE_CHOICES = [
        ("hourly", "Hourly"),
        ("daily", "Daily"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("declined", "Declined"),
        ("cancelled", "Cancelled"),
    ]

    application = models.OneToOneField(
        "applications.Application", on_delete=models.CASCADE, related_name="offer"
    )
    job = models.ForeignKey("jobs.Job", on_delete=models.CASCADE, related_name="offers")
    employer = models.ForeignKey("users.Employer", on_delete=models.CASCADE, related_name="offers")
    traveller = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="job_offers"
    )
    contract_type = models.CharField(max_length=20, choices=CONTRACT_TYPE_CHOICES, default="casual")
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    rate_type = models.CharField(max_length=20, choices=RATE_TYPE_CHOICES, default="hourly")
    rate_amount = models.DecimalField(max_digits=9, decimal_places=2)
    rate_currency = models.CharField(max_length=5, default="AUD")
    accommodation_details = models.TextField(blank=True, default="")
    notes = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:  # pragma: no cover - repr helper
        return f"Offer {self.pk} for application {self.application_id}"


class Timesheet(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("submitted", "Submitted"),
        ("approved", "Approved"),
    ]

    offer = models.OneToOneField("applications.JobOffer", on_delete=models.CASCADE, related_name="timesheet")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    traveller_notes = models.TextField(blank=True, default="")
    employer_notes = models.TextField(blank=True, default="")
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:  # pragma: no cover - repr helper
        return f"Timesheet for offer {self.offer_id}"


class TimesheetEntry(models.Model):
    timesheet = models.ForeignKey(Timesheet, on_delete=models.CASCADE, related_name="entries")
    entry_date = models.DateField()
    hours_worked = models.DecimalField(max_digits=5, decimal_places=2)
    notes = models.TextField(blank=True, default="")
    is_locked = models.BooleanField(default=False)
    is_paid = models.BooleanField(default=False)
    PAYMENT_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("instructions_generated", "Instructions Generated"),
        ("awaiting_bank_import", "Awaiting Bank Import"),
        ("paid", "Paid"),
    ]
    payment_status = models.CharField(max_length=32, choices=PAYMENT_STATUS_CHOICES, default="pending")

    class Meta:
        unique_together = ("timesheet", "entry_date")
        ordering = ["entry_date"]

    def __str__(self) -> str:  # pragma: no cover - repr helper
        return f"TimesheetEntry {self.entry_date} ({self.hours_worked}h)"


def payslip_pdf_upload_to(instance, filename: str) -> str:
    extension = filename.split(".")[-1] if "." in filename else "pdf"
    return f"payslips/{instance.traveller_id}/{uuid.uuid4()}.{extension}"


def payslip_aba_upload_to(instance, filename: str) -> str:
    extension = filename.split(".")[-1] if "." in filename else "aba"
    return f"payslips/{instance.traveller_id}/aba/{uuid.uuid4()}.{extension}"


class Payslip(models.Model):
    STATUS_CHOICES = [
        ("processing", "Processing"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("overdue", "Overdue"),
    ]
    INSTRUCTION_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("instructions_generated", "Instructions Generated"),
        ("awaiting_bank_import", "Awaiting Bank Import"),
        ("completed", "Completed"),
    ]

    timesheet = models.ForeignKey(Timesheet, on_delete=models.CASCADE, related_name="payslips")
    offer = models.ForeignKey(JobOffer, on_delete=models.CASCADE, related_name="payslips")
    employer = models.ForeignKey("users.Employer", on_delete=models.CASCADE, related_name="payslips")
    traveller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="payslips")

    hour_count = models.DecimalField(max_digits=7, decimal_places=2)
    rate_amount = models.DecimalField(max_digits=9, decimal_places=2)
    rate_currency = models.CharField(max_length=5, default="AUD")
    gross_amount = models.DecimalField(max_digits=10, decimal_places=2)
    commission_amount = models.DecimalField(max_digits=10, decimal_places=2)
    net_before_tax = models.DecimalField(max_digits=10, decimal_places=2)
    tax_withheld = models.DecimalField(max_digits=10, decimal_places=2)
    net_payment = models.DecimalField(max_digits=10, decimal_places=2)
    super_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    pay_period_start = models.DateField(null=True, blank=True)
    pay_period_end = models.DateField(null=True, blank=True)
    payment_method = models.CharField(max_length=32, default="bank_transfer")

    employer_name = models.CharField(max_length=255, blank=True, default="")
    employer_address = models.CharField(max_length=255, blank=True, default="")
    employer_abn = models.CharField(max_length=32, blank=True, default="")
    traveller_name = models.CharField(max_length=255, blank=True, default="")
    traveller_address = models.CharField(max_length=255, blank=True, default="")
    traveller_tfn = models.CharField(max_length=32, blank=True, default="")

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="processing")
    instructions_status = models.CharField(max_length=32, choices=INSTRUCTION_STATUS_CHOICES, default="pending")
    metadata = models.JSONField(default=dict, blank=True)
    pdf_file = models.FileField(upload_to=payslip_pdf_upload_to, blank=True)
    aba_file = models.FileField(upload_to=payslip_aba_upload_to, blank=True)
    aba_metadata = models.JSONField(default=dict, blank=True)
    aba_generated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:  # pragma: no cover - repr helper
        return f"Payslip {self.id} for offer {self.offer_id}"
