"""Admin registration for payments and payout accounts."""
from django.contrib import admin
from .models import Payment, PayoutAccount


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("application", "amount_cents", "currency", "status", "created_at")
    list_filter = ("status", "currency")
    search_fields = ("application__job__title",)


@admin.register(PayoutAccount)
class PayoutAccountAdmin(admin.ModelAdmin):
    list_display = ("employer", "stripe_account_id", "onboarding_complete")
    search_fields = ("employer__company_name",)
