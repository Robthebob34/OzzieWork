"""URL routes for messaging API."""
from django.urls import path

from .views import ConversationCreateMessageView, ConversationListView, MessageListCreateView

urlpatterns = [
    path("conversations/", ConversationListView.as_view(), name="messaging-conversations"),
    path(
        "conversations/<int:conversation_id>/messages/",
        MessageListCreateView.as_view(),
        name="messaging-messages",
    ),
    path(
        "conversations/send/",
        ConversationCreateMessageView.as_view(),
        name="messaging-send",
    ),
]
