"""Serializers for job resources."""
from rest_framework import serializers
from .models import Job


class JobSerializer(serializers.ModelSerializer):
    employer_name = serializers.CharField(source="employer.company_name", read_only=True)

    class Meta:
        model = Job
        fields = [
            "id",
            "title",
            "description",
            "location",
            "hourly_rate",
            "currency",
            "is_remote_friendly",
            "start_date",
            "end_date",
            "created_at",
            "updated_at",
            "employer",
            "employer_name",
        ]
        read_only_fields = ("created_at", "updated_at", "employer_name")
