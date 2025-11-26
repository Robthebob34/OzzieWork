"""Serializers for user and employer resources."""
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, Employer, Certification, JobHistory, EmployerWorkerHistory

ROLE_CHOICES = (
    ("traveller", "Traveller"),
    ("employer", "Employer"),
)


class CertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certification
        fields = ["id", "name", "issued_date", "expiry_date"]


class EmployerWorkerHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployerWorkerHistory
        fields = [
            "id",
            "worker_name",
            "job_title",
            "start_date",
            "end_date",
            "rating",
            "notes",
            "created_at",
        ]
        read_only_fields = ("id", "created_at")


class EmployerSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    social_links = serializers.ListField(child=serializers.CharField(), required=False)
    notification_preferences = serializers.DictField(child=serializers.BooleanField(), required=False)

    class Meta:
        model = Employer
        fields = [
            "id",
            "company_name",
            "company_description",
            "abn",
            "verified",
            "business_category",
            "contact_name",
            "contact_phone",
            "contact_email",
            "website",
            "address_street",
            "address_city",
            "address_state",
            "address_postcode",
            "logo_url",
            "social_links",
            "notification_preferences",
            "average_rating",
            "rating_count",
            "user",
        ]
        read_only_fields = ("verified", "average_rating", "rating_count", "user")


class EmployerProfileSerializer(EmployerSerializer):
    worker_history = EmployerWorkerHistorySerializer(many=True, read_only=True)

    class Meta(EmployerSerializer.Meta):
        fields = EmployerSerializer.Meta.fields + ["worker_history"]


class JobHistorySerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = JobHistory
        fields = [
            "id",
            "employer_name",
            "job_title",
            "start_date",
            "end_date",
            "employer_comments",
            "rating",
        ]


class UserSerializer(serializers.ModelSerializer):
    employer_profile = EmployerSerializer(read_only=True)
    certifications = CertificationSerializer(many=True, read_only=True)
    job_history = JobHistorySerializer(many=True, required=False)
    skills = serializers.ListField(child=serializers.CharField(), required=False)
    languages = serializers.ListField(child=serializers.CharField(), required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone",
            "country_of_origin",
            "address_street",
            "address_city",
            "address_state",
            "address_postcode",
            "date_of_birth",
            "profile_picture_url",
            "tfn",
            "abn",
            "bank_name",
            "bank_bsb",
            "bank_account_number",
            "bio",
            "availability",
            "skills",
            "languages",
            "is_traveller",
            "is_employer",
            "global_rating",
            "job_history",
            "employer_profile",
            "certifications",
        ]
        read_only_fields = ("username", "global_rating")

    def validate_email(self, value):
        value = value.lower()
        user_model = get_user_model()
        user = self.instance
        if user_model.objects.filter(email__iexact=value).exclude(pk=getattr(user, "pk", None)).exists():
            raise serializers.ValidationError("Email already exists")
        return value

    def update(self, instance, validated_data):
        job_history_data = validated_data.pop("job_history", None)
        email = validated_data.get("email")
        if email:
            instance.email = email.lower()
            instance.username = email.lower()
        list_fields = ["skills", "languages"]
        simple_fields = [
            "first_name",
            "last_name",
            "phone",
            "country_of_origin",
            "address_street",
            "address_city",
            "address_state",
            "address_postcode",
            "date_of_birth",
            "profile_picture_url",
            "tfn",
            "abn",
            "bank_name",
            "bank_bsb",
            "bank_account_number",
            "bio",
            "availability",
            "is_traveller",
            "is_employer",
        ]
        for field in simple_fields:
            if field in validated_data:
                setattr(instance, field, validated_data[field])
        for field in list_fields:
            if field in validated_data:
                setattr(instance, field, validated_data[field] or [])
        instance.save()

        if job_history_data is not None:
            self._sync_job_history(instance, job_history_data)
        return instance

    def _sync_job_history(self, user, job_history_data):
        existing = {item.id: item for item in user.job_history.all()}
        received_ids = []
        for entry in job_history_data:
            entry_id = entry.get("id")
            if entry_id and entry_id in existing:
                job_history = existing[entry_id]
                for attr, value in entry.items():
                    if attr != "id":
                        setattr(job_history, attr, value)
                job_history.save()
                received_ids.append(entry_id)
            else:
                JobHistory.objects.create(user=user, **entry)
        to_delete = [jh_id for jh_id in existing.keys() if jh_id not in received_ids]
        if to_delete:
            user.job_history.filter(id__in=to_delete).delete()


class PublicUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "is_traveller",
            "is_employer",
        ]
        read_only_fields = fields


class PublicProfileSerializer(serializers.ModelSerializer):
    employer_profile = EmployerSerializer(read_only=True)
    job_history = JobHistorySerializer(many=True, read_only=True)
    skills = serializers.ListField(child=serializers.CharField(), read_only=True)
    languages = serializers.ListField(child=serializers.CharField(), read_only=True)
    certifications = CertificationSerializer(many=True, read_only=True)
    has_tfn = serializers.SerializerMethodField()
    has_abn = serializers.SerializerMethodField()
    has_bank_details = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "profile_picture_url",
            "bio",
            "availability",
            "country_of_origin",
            "address_city",
            "address_state",
            "skills",
            "languages",
            "job_history",
            "certifications",
            "employer_profile",
            "is_traveller",
            "is_employer",
            "global_rating",
            "has_tfn",
            "has_abn",
            "has_bank_details",
        ]
        read_only_fields = fields

    def get_has_tfn(self, obj: User) -> bool:
        return bool((obj.tfn or "").strip())

    def get_has_abn(self, obj: User) -> bool:
        if obj.is_employer and obj.employer_profile:
            return bool((obj.employer_profile.abn or "").strip())
        return bool((obj.abn or "").strip())

    def get_has_bank_details(self, obj: User) -> bool:
        return any(
            field.strip()
            for field in [obj.bank_name or "", obj.bank_bsb or "", obj.bank_account_number or ""]
        )


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=ROLE_CHOICES)

    class Meta:
        model = get_user_model()
        fields = [
            "email",
            "password",
            "confirm_password",
            "first_name",
            "last_name",
            "phone",
            "country_of_origin",
            "role",
        ]

    def validate_email(self, value):
        if get_user_model().objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value.lower()

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match"})
        return attrs

    def create(self, validated_data):
        role = validated_data.pop("role")
        validated_data.pop("confirm_password", None)
        email = validated_data.pop("email")
        user = get_user_model().objects.create_user(
            username=email,
            email=email,
            password=validated_data.pop("password"),
            **validated_data,
        )
        if role == "traveller":
            user.is_traveller = True
        elif role == "employer":
            user.is_employer = True
        user.save(update_fields=["is_traveller", "is_employer"])
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")
        try:
            user_obj = get_user_model().objects.get(email__iexact=email)
        except get_user_model().DoesNotExist as exc:  # pragma: no cover - defensive
            raise serializers.ValidationError({"detail": "Invalid credentials"}) from exc

        from django.contrib.auth import authenticate

        user = authenticate(username=user_obj.username, password=password)
        if user is None:
            raise serializers.ValidationError({"detail": "Invalid credentials"})
        if not user.is_active:
            raise serializers.ValidationError({"detail": "Account disabled"})
        attrs["user"] = user
        return attrs


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


def build_auth_response(user):
    refresh = RefreshToken.for_user(user)
    return {
        "user": PublicUserSerializer(user).data,
        "tokens": {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        },
    }


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_new_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_new_password"]:
            raise serializers.ValidationError({"confirm_new_password": "Passwords do not match"})
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.check_password(attrs["current_password"]):
            raise serializers.ValidationError({"current_password": "Current password is incorrect"})
        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user
