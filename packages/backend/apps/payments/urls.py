"""URL routes for payments."""
from django.urls import path
from .views import (
    PaymentListCreateView,
    PaymentDetailView,
    PayoutAccountView,
    create_connect_account,
    transfer_to_employer,
)

urlpatterns = [
    path("", PaymentListCreateView.as_view(), name="payments-list"),
    path("<int:pk>/", PaymentDetailView.as_view(), name="payments-detail"),
    path("payout-account/", PayoutAccountView.as_view(), name="payout-account"),
    path("connect-account/", create_connect_account, name="payments-connect-account"),
    path("transfer/", transfer_to_employer, name="payments-transfer"),
]
