"""Payment endpoints with Stripe Connect stubs."""
import stripe
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.conf import settings

from .models import Payment, PayoutAccount
from .serializers import PaymentSerializer, PayoutAccountSerializer

stripe.api_key = settings.STRIPE_API_KEY


class PaymentListCreateView(generics.ListCreateAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.select_related("application")

    def perform_create(self, serializer):
        # Example: create a PaymentIntent and store IDs for reconciliation later.
        amount = serializer.validated_data["amount_cents"]
        currency = serializer.validated_data.get("currency", "AUD")
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            automatic_payment_methods={"enabled": True},
        )
        serializer.save(
            stripe_payment_intent_id=intent["id"],
            status=intent["status"],
        )


class PaymentDetailView(generics.RetrieveAPIView):
    queryset = Payment.objects.select_related("application")
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]


class PayoutAccountView(generics.RetrieveUpdateAPIView):
    queryset = PayoutAccount.objects.select_related("employer")
    serializer_class = PayoutAccountSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        employer = self.request.user.employer_profile
        account, _ = PayoutAccount.objects.get_or_create(employer=employer)
        return account


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_connect_account(request):
    """Create a Stripe Connect account link for onboarding."""

    employer = request.user.employer_profile
    account = stripe.Account.create(type="express", country="AU")
    payout_account, _ = PayoutAccount.objects.get_or_create(employer=employer)
    payout_account.stripe_account_id = account["id"]
    payout_account.save()

    link = stripe.AccountLink.create(
        account=account["id"],
        refresh_url="https://example.com/reauth",  # replace with env var in prod
        return_url="https://example.com/success",
        type="account_onboarding",
    )
    return Response({"url": link["url"]})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def transfer_to_employer(request):
    """Stub for transferring funds to employer's Connect account."""

    payout_account = request.user.employer_profile.payout_account
    payment_id = request.data.get("payment_id")
    payment = Payment.objects.get(id=payment_id)
    transfer = stripe.Transfer.create(
        amount=payment.amount_cents,
        currency=payment.currency,
        destination=payout_account.stripe_account_id,
    )
    payment.stripe_transfer_id = transfer["id"]
    payment.status = "succeeded"
    payment.save(update_fields=["stripe_transfer_id", "status"])
    return Response({"transfer_id": transfer["id"]}, status=status.HTTP_200_OK)
