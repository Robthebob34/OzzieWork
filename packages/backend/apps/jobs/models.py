"""Job domain models."""
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class JobStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    ACTIVE = "active", "Active"
    CLOSED = "closed", "Closed"


class JobCategory(models.TextChoices):
    FARMING = "farming", "Farming"
    HOSPITALITY = "hospitality", "Hospitality"
    CONSTRUCTION = "construction", "Construction"
    TOURISM = "tourism", "Tourism"
    LOGISTICS = "logistics", "Logistics"
    RETAIL = "retail", "Retail"
    OTHER = "other", "Other"


class EmploymentType(models.TextChoices):
    CASUAL = "casual", "Casual"
    PART_TIME = "part_time", "Part-time"
    FULL_TIME = "full_time", "Full-time"
    CONTRACT = "contract", "Contract"


class Job(models.Model):
    """Represents an open job posted by an employer."""

    employer = models.ForeignKey(
        "users.Employer", on_delete=models.CASCADE, related_name="jobs"
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(
        max_length=64, choices=JobCategory.choices, default=JobCategory.OTHER
    )
    employment_type = models.CharField(
        max_length=32, choices=EmploymentType.choices, default=EmploymentType.CASUAL
    )
    location = models.CharField(max_length=255)
    location_address = models.CharField(max_length=255, blank=True, default="")
    location_city = models.CharField(max_length=128, blank=True, default="")
    location_state = models.CharField(max_length=128, blank=True, default="")
    location_region = models.CharField(max_length=128, blank=True, default="")
    location_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    location_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    is_live = models.BooleanField(default=False)
    hourly_rate = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)]
    )
    fixed_salary = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)]
    )
    currency = models.CharField(max_length=5, default="AUD")
    is_remote_friendly = models.BooleanField(default=False)
    work_hours_per_day = models.DecimalField(
        max_digits=4, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)]
    )
    days_per_week = models.DecimalField(
        max_digits=4, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)]
    )
    accommodation_provided = models.BooleanField(default=False)
    accommodation_cost = models.DecimalField(
        max_digits=7, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)]
    )
    transport_provided = models.BooleanField(default=False)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    experience_required = models.BooleanField(default=False)
    skills = models.TextField(blank=True, default="")
    language_requirements = models.TextField(blank=True, default="")
    certifications_required = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=JobStatus.choices, default=JobStatus.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_jobs",
    )

    def __str__(self) -> str:  # pragma: no cover - repr helper
        return self.title
