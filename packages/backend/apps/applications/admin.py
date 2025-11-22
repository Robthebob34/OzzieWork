"""Admin registration for applications."""
from django.contrib import admin
from .models import Application


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ("job", "applicant", "status", "submitted_at")
    list_filter = ("status",)
    search_fields = ("job__title", "applicant__username")
