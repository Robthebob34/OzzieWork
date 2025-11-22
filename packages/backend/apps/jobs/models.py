"""Job domain models."""
from django.db import models
from django.conf import settings


class Job(models.Model):
    """Represents an open job posted by an employer."""

    employer = models.ForeignKey(
        "users.Employer", on_delete=models.CASCADE, related_name="jobs"
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    location = models.CharField(max_length=255)
    hourly_rate = models.DecimalField(max_digits=8, decimal_places=2)
    currency = models.CharField(max_length=5, default="AUD")
    is_remote_friendly = models.BooleanField(default=False)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
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
