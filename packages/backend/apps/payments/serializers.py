"""Serializers for payment / payout resources."""
from rest_framework import serializers
from .models import Payment, PayoutAccount


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id",
            "application",
            "amount_cents",
            "currency",
            "stripe_payment_intent_id",
            "stripe_transfer_id",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("stripe_payment_intent_id", "stripe_transfer_id", "status")


class PayoutAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayoutAccount
        fields = ["id", "employer", "stripe_account_id", "onboarding_complete", "created_at"]
        read_only_fields = ("created_at",)
