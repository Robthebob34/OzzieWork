"""Serializers for messaging resources."""
from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Conversation, Message

User = get_user_model()


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "sender",
            "sender_name",
            "body",
            "created_at",
            "is_system",
            "message_type",
            "metadata",
        ]
        read_only_fields = (
            "id",
            "conversation",
            "sender",
            "sender_name",
            "created_at",
            "is_system",
            "message_type",
            "metadata",
        )

    def get_sender_name(self, obj: Message) -> str:
        return obj.sender.get_full_name() or obj.sender.email


class ConversationSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source="job.title", read_only=True)
    employer_name = serializers.SerializerMethodField()
    traveller_name = serializers.SerializerMethodField()
    other_participant_name = serializers.SerializerMethodField()
    last_message_preview = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "job",
            "job_title",
            "employer",
            "employer_name",
            "traveller",
            "traveller_name",
            "last_message_at",
            "last_message_preview",
            "other_participant_name",
        ]
        read_only_fields = fields

    def _get_user_display(self, user: User) -> str:
        if not user:
            return ""
        if user.is_employer and hasattr(user, "employer_profile"):
            return user.employer_profile.company_name or user.get_full_name() or user.email
        return user.get_full_name() or user.email

    def get_employer_name(self, obj: Conversation) -> str:
        return self._get_user_display(obj.employer)

    def get_traveller_name(self, obj: Conversation) -> str:
        return self._get_user_display(obj.traveller)

    def get_other_participant_name(self, obj: Conversation) -> str:
        request = self.context.get("request")
        if not request:
            return ""
        if request.user == obj.employer:
            return self.get_traveller_name(obj)
        return self.get_employer_name(obj)

    def get_last_message_preview(self, obj: Conversation) -> str:
        last_message = obj.messages.order_by("-created_at").first()
        if last_message:
            preview = last_message.body.strip()
            return preview[:140] + ("…" if len(preview) > 140 else "")
        return ""
