"""Application domain models."""
from django.db import models
from django.conf import settings


class Application(models.Model):
    """Represents a traveller applying for a job."""

    STATUS_CHOICES = [
        ("submitted", "Submitted"),
        ("review", "In Review"),
        ("interview", "Interview"),
        ("hired", "Hired"),
        ("rejected", "Rejected"),
    ]

    job = models.ForeignKey("jobs.Job", on_delete=models.CASCADE, related_name="applications")
    applicant = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="applications"
    )
    cover_letter = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="submitted")
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["job", "applicant"], name="unique_job_applicant_application")
        ]

    def __str__(self) -> str:  # pragma: no cover - repr helper
        return f"{self.applicant} -> {self.job}"
