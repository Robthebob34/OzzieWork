"""User and employer related models."""
from decimal import Decimal
from django.contrib.auth.models import AbstractUser
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class User(AbstractUser):
    """Custom user with traveller / employer flags."""

    email = models.EmailField(unique=True)
    is_traveller = models.BooleanField(default=False)
    is_employer = models.BooleanField(default=False)
    phone = models.CharField(max_length=20, blank=True, default="")
    country_of_origin = models.CharField(max_length=64, blank=True)
    address_street = models.CharField(max_length=255, blank=True, default="")
    address_city = models.CharField(max_length=128, blank=True, default="")
    address_state = models.CharField(max_length=128, blank=True, default="")
    address_postcode = models.CharField(max_length=16, blank=True, default="")
    date_of_birth = models.DateField(null=True, blank=True)
    profile_picture_url = models.URLField(blank=True, default="")
    tfn = models.CharField(max_length=20, blank=True, default="")
    abn = models.CharField(max_length=20, blank=True, default="")
    bank_name = models.CharField(max_length=120, blank=True, default="")
    bank_bsb = models.CharField(max_length=10, blank=True, default="")
    bank_account_number = models.CharField(max_length=32, blank=True, default="")
    bio = models.TextField(blank=True, default="")
    availability = models.CharField(max_length=120, blank=True, default="")
    skills = models.JSONField(default=list, blank=True)
    languages = models.JSONField(default=list, blank=True)
    global_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.email.lower()
        super().save(*args, **kwargs)

    def update_global_rating(self):
        ratings = list(self.job_history.values_list("rating", flat=True))
        if ratings:
            average = sum(ratings) / Decimal(len(ratings))
            self.global_rating = round(average, 2)
        else:
            self.global_rating = Decimal("0.00")
        self.save(update_fields=["global_rating"])


class Employer(models.Model):
    """Employer profile linked to a user."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="employer_profile")
    company_name = models.CharField(max_length=255, blank=True, default="")
    company_description = models.TextField(blank=True, default="")
    abn = models.CharField(max_length=32, blank=True, default="")
    verified = models.BooleanField(default=False)
    business_category = models.CharField(max_length=128, blank=True, default="")
    contact_name = models.CharField(max_length=128, blank=True, default="")
    contact_phone = models.CharField(max_length=32, blank=True, default="")
    contact_email = models.EmailField(blank=True, default="")
    website = models.URLField(blank=True, default="")
    address_street = models.CharField(max_length=255, blank=True, default="")
    address_city = models.CharField(max_length=128, blank=True, default="")
    address_state = models.CharField(max_length=128, blank=True, default="")
    address_postcode = models.CharField(max_length=16, blank=True, default="")
    logo_url = models.URLField(blank=True, default="")
    social_links = models.JSONField(default=list, blank=True)
    notification_preferences = models.JSONField(default=dict, blank=True)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    rating_count = models.PositiveIntegerField(default=0)

    def __str__(self) -> str:  # pragma: no cover - repr helper
        return self.company_name


class EmployerWorkerHistory(models.Model):
    """Track workers previously hired by an employer."""

    employer = models.ForeignKey(Employer, on_delete=models.CASCADE, related_name="worker_history")
    worker_name = models.CharField(max_length=255)
    job_title = models.CharField(max_length=255, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    rating = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        null=True,
        blank=True,
    )
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_date", "-created_at"]

    def __str__(self):  # pragma: no cover - repr helper
        return f"{self.worker_name} ({self.job_title})"


class JobHistory(models.Model):
    """Past job engagements and ratings for a user."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="job_history")
    employer_name = models.CharField(max_length=255)
    job_title = models.CharField(max_length=255)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    employer_comments = models.TextField(blank=True)
    rating = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-start_date", "-created_at"]

    def __str__(self) -> str:  # pragma: no cover - repr helper
        return f"{self.job_title} @ {self.employer_name}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.user.update_global_rating()

    def delete(self, *args, **kwargs):
        user = self.user
        super().delete(*args, **kwargs)
        user.update_global_rating()


class Certification(models.Model):
    """Certifications for traveller skills (e.g., RSA, White Card)."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="certifications")
    name = models.CharField(max_length=128)
    issued_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)

    def __str__(self) -> str:  # pragma: no cover - repr helper
        return f"{self.name} ({self.user.username})"
