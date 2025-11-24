"""Serializers for job resources."""
from decimal import Decimal

from rest_framework import serializers

from .models import Job, JobStatus
from .utils import geocode_query


class JobSerializer(serializers.ModelSerializer):
    employer_name = serializers.CharField(source="employer.company_name", read_only=True)
    distance_km = serializers.FloatField(read_only=True)

    class Meta:
        model = Job
        fields = [
            "id",
            "title",
            "description",
            "category",
            "employment_type",
            "location",
            "location_address",
            "location_city",
            "location_state",
            "location_region",
            "location_latitude",
            "location_longitude",
            "is_live",
            "hourly_rate",
            "fixed_salary",
            "currency",
            "is_remote_friendly",
            "work_hours_per_day",
            "days_per_week",
            "accommodation_provided",
            "accommodation_cost",
            "transport_provided",
            "start_date",
            "end_date",
            "experience_required",
            "skills",
            "language_requirements",
            "certifications_required",
            "status",
            "created_at",
            "updated_at",
            "employer",
            "employer_name",
            "distance_km",
        ]
        read_only_fields = (
            "created_at",
            "updated_at",
            "employer",
            "employer_name",
            "distance_km",
        )

    def validate(self, attrs):
        hourly_rate = attrs.get("hourly_rate")
        fixed_salary = attrs.get("fixed_salary")

        if hourly_rate is None and fixed_salary is None:
            raise serializers.ValidationError(
                "Provide either an hourly_rate or a fixed_salary for the job."
            )

        return super().validate(attrs)

    def validate_title(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Job title is required.")
        return value

    def validate_description(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Job description is required.")
        return value

    def _maybe_attach_coordinates(self, data):
        latitude = data.get("location_latitude")
        longitude = data.get("location_longitude")

        location_fields = [
            data.get("location_address"),
            data.get("location_city"),
            data.get("location_state"),
            data.get("location_region"),
            data.get("location"),
        ]

        if (latitude is None or longitude is None) and any(location_fields):
            query = ", ".join(filter(None, location_fields))
            coords = geocode_query(query)
            if coords:
                data["location_latitude"] = Decimal(str(coords[0]))
                data["location_longitude"] = Decimal(str(coords[1]))
        return data

    def _apply_status_from_live_flag(self, data):
        if "is_live" not in data:
            return data
        is_live = data["is_live"]
        if is_live:
            data["status"] = JobStatus.ACTIVE
        else:
            data.setdefault("status", JobStatus.DRAFT)
        return data

    def create(self, validated_data):
        validated_data = self._maybe_attach_coordinates(validated_data)
        validated_data = self._apply_status_from_live_flag(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        location_keys = {
            "location",
            "location_address",
            "location_city",
            "location_state",
            "location_region",
            "location_latitude",
            "location_longitude",
        }
        if location_keys.intersection(validated_data.keys()):
            validated_data = self._maybe_attach_coordinates(validated_data)
        validated_data = self._apply_status_from_live_flag(validated_data)
        return super().update(instance, validated_data)
