"""Admin registration for hours worked."""
from django.contrib import admin
from .models import HoursWorked


@admin.register(HoursWorked)
class HoursWorkedAdmin(admin.ModelAdmin):
    list_display = ("worker", "application", "date", "hours", "approved")
    list_filter = ("approved", "date")
    search_fields = ("worker__username", "application__job__title")
