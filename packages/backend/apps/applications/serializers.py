"""Serializers for applications."""
from rest_framework import serializers
from .models import Application


class ApplicationSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source="job.title", read_only=True)
    applicant_username = serializers.CharField(source="applicant.username", read_only=True)
    applicant_name = serializers.SerializerMethodField()
    applicant_profile_summary = serializers.SerializerMethodField()
    applicant_availability = serializers.CharField(source="applicant.availability", read_only=True)
    applicant_bio = serializers.CharField(source="applicant.bio", read_only=True)
    applicant_skills = serializers.ListField(
        source="applicant.skills", child=serializers.CharField(), read_only=True
    )
    applicant_profile_picture_url = serializers.CharField(
        source="applicant.profile_picture_url", read_only=True
    )

    class Meta:
        model = Application
        fields = [
            "id",
            "job",
            "job_title",
            "applicant",
            "applicant_username",
            "applicant_name",
            "applicant_profile_summary",
            "applicant_availability",
            "applicant_bio",
            "applicant_skills",
            "applicant_profile_picture_url",
            "cover_letter",
            "status",
            "submitted_at",
            "updated_at",
        ]
        read_only_fields = (
            "submitted_at",
            "updated_at",
            "job_title",
            "applicant",
            "applicant_username",
            "applicant_name",
            "applicant_profile_summary",
            "applicant_availability",
            "applicant_bio",
            "applicant_skills",
            "applicant_profile_picture_url",
        )

    def get_applicant_name(self, obj: Application) -> str:
        applicant = obj.applicant
        return applicant.get_full_name() or applicant.username or applicant.email

    def get_applicant_profile_summary(self, obj: Application) -> str:
        applicant = obj.applicant
        bio = (applicant.bio or "").strip()
        if bio:
            return bio
        cover_letter = (obj.cover_letter or "").strip()
        if cover_letter:
            preview = cover_letter[:200]
            return preview + ("…" if len(cover_letter) > 200 else "")
        return ""

    def validate(self, attrs):
        request = self.context.get("request")
        job = attrs.get("job")
        if request and request.method == "POST" and job:
            applicant = request.user
            if Application.objects.filter(job=job, applicant=applicant).exists():
                raise serializers.ValidationError("You have already applied for this job.")
        return super().validate(attrs)
