"""Payment domain models tied to Stripe Connect flows."""
from django.db import models


class Payment(models.Model):
    """Represents a Stripe payment or transfer for an application."""

    application = models.ForeignKey(
        "applications.Application", on_delete=models.CASCADE, related_name="payments"
    )
    amount_cents = models.PositiveIntegerField()
    currency = models.CharField(max_length=5, default="AUD")
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True)
    stripe_transfer_id = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=32,
        choices=[
            ("pending", "Pending"),
            ("succeeded", "Succeeded"),
            ("failed", "Failed"),
        ],
        default="pending",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:  # pragma: no cover - repr helper
        return f"Payment {self.id} - {self.status}"


class PayoutAccount(models.Model):
    """Stores Stripe Connect account references for employers."""

    employer = models.OneToOneField(
        "users.Employer", on_delete=models.CASCADE, related_name="payout_account"
    )
    stripe_account_id = models.CharField(max_length=255)
    onboarding_complete = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:  # pragma: no cover - repr helper
        return f"{self.employer} - {self.stripe_account_id}"
