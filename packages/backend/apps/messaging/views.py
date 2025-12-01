"""API views for messaging system."""
from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer
from apps.users.utils import ensure_employer_not_suspended, SUSPENSION_MESSAGE
from apps.applications.models import JobOffer

User = get_user_model()


class ConversationListView(generics.ListAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        base_qs = Conversation.objects.prefetch_related("messages", "job", "employer", "traveller")
        return base_qs.filter(Q(employer=user) | Q(traveller=user)).order_by("-last_message_at")


class MessageListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, conversation_id):
        conversation = self._get_conversation(conversation_id)
        messages = conversation.messages.select_related("sender").order_by("created_at")
        data = MessageSerializer(messages, many=True).data
        return Response(data)

    def post(self, request, conversation_id):
        conversation = self._get_conversation(conversation_id)
        self._assert_messaging_allowed(request.user, conversation)
        body = request.data.get("body", "").strip()
        if not body:
            return Response({"body": "Message body is required."}, status=status.HTTP_400_BAD_REQUEST)

        message = Message.objects.create(conversation=conversation, sender=request.user, body=body)
        conversation.last_message_at = message.created_at
        conversation.save(update_fields=["last_message_at", "updated_at"])
        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)

    def _get_conversation(self, conversation_id):
        user = self.request.user
        conversation = (
            Conversation.objects.filter(id=conversation_id)
            .select_related("employer", "traveller", "job")
            .first()
        )
        if not conversation or (conversation.employer != user and conversation.traveller != user):
            raise permissions.PermissionDenied("Conversation not found or inaccessible.")
        return conversation

    def _assert_messaging_allowed(self, user, conversation):
        if not getattr(user, "is_employer", False):
            return
        employer_profile = getattr(user, "employer_profile", None)
        if not employer_profile or not employer_profile.is_suspended:
            return
        if self._conversation_has_hired_relationship(conversation):
            return
        raise ValidationError({"detail": SUSPENSION_MESSAGE, "code": "employer_suspended"})

    @staticmethod
    def _conversation_has_hired_relationship(conversation):
        job = conversation.job
        if not job:
            return False
        return JobOffer.objects.filter(job=job, traveller=conversation.traveller, status="accepted").exists()


class ConversationCreateMessageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        traveller_id = request.data.get("traveller_id")
        employer_id = request.data.get("employer_id")
        job_id = request.data.get("job_id")
        body = request.data.get("body", "").strip()

        if not all([traveller_id, employer_id, body]):
            return Response(
                {"detail": "traveller_id, employer_id, and body are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        traveller = User.objects.filter(id=traveller_id).first()
        employer = User.objects.filter(id=employer_id).first()

        if not traveller or not employer:
            return Response({"detail": "Invalid participant."}, status=status.HTTP_400_BAD_REQUEST)

        if request.user == employer and getattr(request.user, "is_employer", False):
            if employer.employer_profile and employer.employer_profile.is_suspended:
                if not (job_id and self._has_hired_relationship(job_id, traveller.id)):
                    raise ValidationError({"detail": SUSPENSION_MESSAGE, "code": "employer_suspended"})
            ensure_employer_not_suspended(request.user)

        conversation, _ = Conversation.objects.get_or_create(
            traveller=traveller, employer=employer, job_id=job_id
        )

        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            body=body,
        )

        conversation.last_message_at = message.created_at
        conversation.save(update_fields=["last_message_at", "updated_at"])

        return Response(
            {
                "conversation": ConversationSerializer(conversation, context={"request": request}).data,
                "message": MessageSerializer(message).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @staticmethod
    def _has_hired_relationship(job_id, traveller_id):
        if not (job_id and traveller_id):
            return False
        return JobOffer.objects.filter(job_id=job_id, traveller_id=traveller_id, status="accepted").exists()
