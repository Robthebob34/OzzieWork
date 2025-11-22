"""Admin registration for users app."""
from django.contrib import admin
from .models import User, Employer, Certification


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("username", "email", "is_traveller", "is_employer")
    search_fields = ("username", "email")
    list_filter = ("is_traveller", "is_employer")


@admin.register(Employer)
class EmployerAdmin(admin.ModelAdmin):
    list_display = ("company_name", "user", "verified")
    search_fields = ("company_name", "user__username")


@admin.register(Certification)
class CertificationAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "issued_date", "expiry_date")
    search_fields = ("name", "user__username")
