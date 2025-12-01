from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("jobs", "0004_job_location_geo"),
        ("users", "0004_employer_expansion"),
        ("applications", "0002_unique_application_constraint"),
    ]

    operations = [
        migrations.AlterField(
            model_name="application",
            name="status",
            field=models.CharField(
                choices=[
                    ("submitted", "Submitted"),
                    ("review", "In Review"),
                    ("interview", "Interview"),
                    ("offer_sent", "Offer Sent"),
                    ("offer_accepted", "Offer Accepted"),
                    ("offer_declined", "Offer Declined"),
                    ("hired", "Hired"),
                    ("rejected", "Rejected"),
                    ("cancelled", "Cancelled"),
                ],
                default="submitted",
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name="JobOffer",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "contract_type",
                    models.CharField(
                        choices=[("casual", "Casual")], default="casual", max_length=20
                    ),
                ),
                ("start_date", models.DateField()),
                ("end_date", models.DateField(blank=True, null=True)),
                (
                    "rate_type",
                    models.CharField(
                        choices=[("hourly", "Hourly"), ("daily", "Daily")], default="hourly", max_length=20
                    ),
                ),
                ("rate_amount", models.DecimalField(decimal_places=2, max_digits=9)),
                ("rate_currency", models.CharField(default="AUD", max_length=5)),
                ("accommodation_details", models.TextField(blank=True, default="")),
                ("notes", models.TextField(blank=True, default="")),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("accepted", "Accepted"),
                            ("declined", "Declined"),
                            ("cancelled", "Cancelled"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "application",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="offer",
                        to="applications.application",
                    ),
                ),
                (
                    "employer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="offers",
                        to="users.employer",
                    ),
                ),
                (
                    "job",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, related_name="offers", to="jobs.job"
                    ),
                ),
                (
                    "traveller",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="job_offers",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
