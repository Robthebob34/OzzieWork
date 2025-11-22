"""Admin registration for job models."""
from django.contrib import admin
from .models import Job


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ("title", "employer", "location", "hourly_rate", "is_remote_friendly")
    list_filter = ("location", "is_remote_friendly")
    search_fields = ("title", "employer__company_name")
