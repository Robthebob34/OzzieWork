"""Serializers for user and employer resources."""
from rest_framework import serializers
from .models import User, Employer, Certification


class CertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certification
        fields = ["id", "name", "issued_date", "expiry_date"]


class EmployerSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Employer
        fields = ["id", "company_name", "company_description", "abn", "verified", "user"]


class UserSerializer(serializers.ModelSerializer):
    employer_profile = EmployerSerializer(read_only=True)
    certifications = CertificationSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "is_traveller",
            "is_employer",
            "phone",
            "country_of_origin",
            "employer_profile",
            "certifications",
        ]
        read_only_fields = ("username", "email")
