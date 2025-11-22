"""Hours worked tracking models."""
from django.db import models
from django.conf import settings


class HoursWorked(models.Model):
    """Track approved hours for a job application."""

    application = models.ForeignKey(
        "applications.Application", on_delete=models.CASCADE, related_name="hours_entries"
    )
    worker = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="hours_entries"
    )
    date = models.DateField()
    hours = models.DecimalField(max_digits=5, decimal_places=2)
    approved = models.BooleanField(default=False)
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self) -> str:  # pragma: no cover - repr helper
        return f"{self.worker} {self.hours}h on {self.date}"
