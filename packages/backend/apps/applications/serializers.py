"""Serializers for applications."""
from rest_framework import serializers
from .models import Application, JobOffer, Timesheet, TimesheetEntry, Payslip


class TimesheetEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = TimesheetEntry
        fields = ["entry_date", "hours_worked", "notes", "is_locked", "is_paid", "payment_status"]


class TimesheetSerializer(serializers.ModelSerializer):
    entries = TimesheetEntrySerializer(many=True, read_only=True)

    class Meta:
        model = Timesheet
        fields = [
            "status",
            "traveller_notes",
            "employer_notes",
            "submitted_at",
            "approved_at",
            "entries",
        ]


class PayslipSerializer(serializers.ModelSerializer):
    traveller_name = serializers.CharField(read_only=True)
    pdf_url = serializers.SerializerMethodField()
    aba_url = serializers.SerializerMethodField()

    class Meta:
        model = Payslip
        fields = [
            "id",
            "status",
            "hour_count",
            "rate_amount",
            "rate_currency",
            "gross_amount",
            "commission_amount",
             "super_amount",
            "net_before_tax",
            "tax_withheld",
            "net_payment",
            "pay_period_start",
            "pay_period_end",
            "payment_method",
            "employer_name",
            "employer_address",
            "employer_abn",
            "traveller_name",
            "traveller_address",
            "traveller_tfn",
            "metadata",
            "instructions_status",
            "aba_generated_at",
            "aba_url",
            "pdf_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_pdf_url(self, obj):
        if obj.pdf_file:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.pdf_file.url)
            return obj.pdf_file.url
        return ""

    def get_aba_url(self, obj):
        if obj.aba_file:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.aba_file.url)
            return obj.aba_file.url
        return ""


class JobOfferSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source="job.title", read_only=True)
    employer_name = serializers.SerializerMethodField()
    traveller_name = serializers.SerializerMethodField()
    timesheet = serializers.SerializerMethodField()

    class Meta:
        model = JobOffer
        fields = [
            "id",
            "application",
            "job",
            "job_title",
            "employer",
            "employer_name",
            "traveller",
            "traveller_name",
            "contract_type",
            "start_date",
            "end_date",
            "rate_type",
            "rate_amount",
            "rate_currency",
            "accommodation_details",
            "notes",
            "status",
            "created_at",
            "updated_at",
            "timesheet",
        ]
        read_only_fields = (
            "id",
            "application",
            "job",
            "job_title",
            "employer",
            "employer_name",
            "traveller",
            "traveller_name",
            "created_at",
            "updated_at",
        )

    def get_employer_name(self, obj: JobOffer) -> str:
        employer_user = getattr(obj.employer, "user", None)
        if employer_user and employer_user.get_full_name():
            return employer_user.get_full_name()
        return obj.employer.company_name or ""

    def get_traveller_name(self, obj: JobOffer) -> str:
        return obj.traveller.get_full_name() or obj.traveller.email

    def get_timesheet(self, obj: JobOffer):
        timesheet = getattr(obj, "timesheet", None)
        if not timesheet:
            return None
        return TimesheetSerializer(timesheet).data

    def validate(self, attrs):
        start_date = attrs.get("start_date")
        has_start_date = start_date or getattr(self.instance, "start_date", None)
        if not has_start_date:
            raise serializers.ValidationError({"start_date": "Start date is required."})

        if "rate_amount" in attrs:
            rate_amount = attrs.get("rate_amount")
            if rate_amount is None or rate_amount <= 0:
                raise serializers.ValidationError({"rate_amount": "Provide a positive rate."})
        elif not self.instance:
            raise serializers.ValidationError({"rate_amount": "Provide a positive rate."})

        return super().validate(attrs)

    def create(self, validated_data):
        application = self.context.get("application")
        if not application:
            raise serializers.ValidationError("Application context required to create an offer.")
        job = application.job
        employer = job.employer
        traveller = application.applicant
        return JobOffer.objects.create(
            application=application,
            job=job,
            employer=employer,
            traveller=traveller,
            **validated_data,
        )

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance


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
    offer = JobOfferSerializer(read_only=True)

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
            "offer",
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
