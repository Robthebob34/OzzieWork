"""Serializers for applications."""
from rest_framework import serializers
from .models import Application


class ApplicationSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source="job.title", read_only=True)
    applicant_username = serializers.CharField(source="applicant.username", read_only=True)

    class Meta:
        model = Application
        fields = [
            "id",
            "job",
            "job_title",
            "applicant",
            "applicant_username",
            "cover_letter",
            "status",
            "submitted_at",
            "updated_at",
        ]
        read_only_fields = ("submitted_at", "updated_at", "job_title", "applicant_username")
