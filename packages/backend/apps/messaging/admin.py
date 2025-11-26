from django.contrib import admin

from .models import Conversation, Message


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "employer", "traveller", "job", "last_message_at")
    list_filter = ("created_at", "last_message_at")
    search_fields = ("employer__email", "traveller__email", "job__title")


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "sender", "created_at", "is_system")
    list_filter = ("is_system", "created_at")
    search_fields = ("conversation__id", "sender__email", "body")
