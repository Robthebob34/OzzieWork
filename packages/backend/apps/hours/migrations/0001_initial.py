from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("applications", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="HoursWorked",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField()),
                ("hours", models.DecimalField(decimal_places=2, max_digits=5)),
                ("approved", models.BooleanField(default=False)),
                ("note", models.CharField(blank=True, max_length=255)),
                (
                    "application",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="hours_entries", to="applications.application"),
                ),
                (
                    "worker",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="hours_entries", to=settings.AUTH_USER_MODEL),
                ),
            ],
            options={"ordering": ["-date"]},
        ),
    ]
