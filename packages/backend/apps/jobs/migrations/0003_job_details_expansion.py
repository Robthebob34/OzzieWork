from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ("jobs", "0002_job_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="job",
            name="accommodation_cost",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=7,
                null=True,
                validators=[django.core.validators.MinValueValidator(0)],
            ),
        ),
        migrations.AddField(
            model_name="job",
            name="accommodation_provided",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="job",
            name="category",
            field=models.CharField(
                choices=[
                    ("farming", "Farming"),
                    ("hospitality", "Hospitality"),
                    ("construction", "Construction"),
                    ("tourism", "Tourism"),
                    ("logistics", "Logistics"),
                    ("retail", "Retail"),
                    ("other", "Other"),
                ],
                default="other",
                max_length=64,
            ),
        ),
        migrations.AddField(
            model_name="job",
            name="certifications_required",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="job",
            name="days_per_week",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=4,
                null=True,
                validators=[django.core.validators.MinValueValidator(0)],
            ),
        ),
        migrations.AddField(
            model_name="job",
            name="employment_type",
            field=models.CharField(
                choices=[
                    ("casual", "Casual"),
                    ("part_time", "Part-time"),
                    ("full_time", "Full-time"),
                    ("contract", "Contract"),
                ],
                default="casual",
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="job",
            name="experience_required",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="job",
            name="fixed_salary",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=10,
                null=True,
                validators=[django.core.validators.MinValueValidator(0)],
            ),
        ),
        migrations.AddField(
            model_name="job",
            name="is_live",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="job",
            name="language_requirements",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="job",
            name="location_address",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="job",
            name="location_city",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
        migrations.AddField(
            model_name="job",
            name="location_state",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
        migrations.AddField(
            model_name="job",
            name="skills",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="job",
            name="transport_provided",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="job",
            name="work_hours_per_day",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=4,
                null=True,
                validators=[django.core.validators.MinValueValidator(0)],
            ),
        ),
        migrations.AlterField(
            model_name="job",
            name="hourly_rate",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=8,
                null=True,
                validators=[django.core.validators.MinValueValidator(0)],
            ),
        ),
    ]
