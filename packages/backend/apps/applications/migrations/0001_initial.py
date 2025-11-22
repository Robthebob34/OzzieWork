from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("jobs", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Application",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("cover_letter", models.TextField(blank=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("submitted", "Submitted"),
                            ("review", "In Review"),
                            ("interview", "Interview"),
                            ("hired", "Hired"),
                            ("rejected", "Rejected"),
                        ],
                        default="submitted",
                        max_length=20,
                    ),
                ),
                ("submitted_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "applicant",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="applications", to=settings.AUTH_USER_MODEL),
                ),
                (
                    "job",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="applications", to="jobs.job"),
                ),
            ],
        ),
    ]
