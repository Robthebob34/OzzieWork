from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("users", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Job",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField()),
                ("location", models.CharField(max_length=255)),
                ("hourly_rate", models.DecimalField(decimal_places=2, max_digits=8)),
                ("currency", models.CharField(default="AUD", max_length=5)),
                ("is_remote_friendly", models.BooleanField(default=False)),
                ("start_date", models.DateField(blank=True, null=True)),
                ("end_date", models.DateField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="created_jobs", to=settings.AUTH_USER_MODEL),
                ),
                (
                    "employer",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="jobs", to="users.employer"),
                ),
            ],
        ),
    ]
