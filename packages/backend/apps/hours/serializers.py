"""Serializers for hours worked entries."""
from rest_framework import serializers
from .models import HoursWorked


class HoursWorkedSerializer(serializers.ModelSerializer):
    application_id = serializers.IntegerField(source="application.id", read_only=True)

    class Meta:
        model = HoursWorked
        fields = [
            "id",
            "application",
            "application_id",
            "worker",
            "date",
            "hours",
            "approved",
            "note",
        ]
        read_only_fields = ("worker",)
