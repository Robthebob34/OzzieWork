"""User and employer related models."""
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user with traveller / employer flags."""

    is_traveller = models.BooleanField(default=False)
    is_employer = models.BooleanField(default=False)
    phone = models.CharField(max_length=20, blank=True)
    country_of_origin = models.CharField(max_length=64, blank=True)


class Employer(models.Model):
    """Employer profile linked to a user."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="employer_profile")
    company_name = models.CharField(max_length=255)
    company_description = models.TextField(blank=True)
    abn = models.CharField(max_length=32, blank=True)
    verified = models.BooleanField(default=False)

    def __str__(self) -> str:  # pragma: no cover - repr helper
        return self.company_name


class Certification(models.Model):
    """Certifications for traveller skills (e.g., RSA, White Card)."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="certifications")
    name = models.CharField(max_length=128)
    issued_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)

    def __str__(self) -> str:  # pragma: no cover - repr helper
        return f"{self.name} ({self.user.username})"
