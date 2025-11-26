"""Models for user messaging between travellers and employers."""
from django.conf import settings
from django.db import models


class Conversation(models.Model):
    """A conversation between a traveller and an employer, optionally tied to a job."""

    employer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="employer_conversations"
    )
    traveller = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="traveller_conversations"
    )
    job = models.ForeignKey("jobs.Job", on_delete=models.CASCADE, null=True, blank=True, related_name="conversations")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_message_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-last_message_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["employer", "traveller", "job"], name="unique_job_conversation"
            )
        ]

    def __str__(self) -> str:  # pragma: no cover - admin helper
        return f"Conversation {self.pk}"


class Message(models.Model):
    """Individual messages exchanged within a conversation."""

    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="messages"
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_messages"
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_system = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:  # pragma: no cover - admin helper
        return f"Message {self.pk}"
