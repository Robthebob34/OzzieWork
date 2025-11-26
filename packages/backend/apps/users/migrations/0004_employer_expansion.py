from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0003_user_abn_user_address_city_user_address_postcode_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="employer",
            name="address_city",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
        migrations.AddField(
            model_name="employer",
            name="address_postcode",
            field=models.CharField(blank=True, default="", max_length=16),
        ),
        migrations.AddField(
            model_name="employer",
            name="address_state",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
        migrations.AddField(
            model_name="employer",
            name="address_street",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="employer",
            name="average_rating",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=3),
        ),
        migrations.AddField(
            model_name="employer",
            name="business_category",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
        migrations.AlterField(
            model_name="employer",
            name="company_name",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="employer",
            name="contact_email",
            field=models.EmailField(blank=True, default="", max_length=254),
        ),
        migrations.AddField(
            model_name="employer",
            name="contact_name",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
        migrations.AddField(
            model_name="employer",
            name="contact_phone",
            field=models.CharField(blank=True, default="", max_length=32),
        ),
        migrations.AddField(
            model_name="employer",
            name="logo_url",
            field=models.URLField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="employer",
            name="notification_preferences",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="employer",
            name="rating_count",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="employer",
            name="social_links",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="employer",
            name="website",
            field=models.URLField(blank=True, default=""),
        ),
        migrations.AlterField(
            model_name="employer",
            name="company_description",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AlterField(
            model_name="employer",
            name="abn",
            field=models.CharField(blank=True, default="", max_length=32),
        ),
        migrations.AlterField(
            model_name="employer",
            name="company_name",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AlterField(
            model_name="user",
            name="phone",
            field=models.CharField(blank=True, default="", max_length=20),
        ),
        migrations.CreateModel(
            name="EmployerWorkerHistory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("worker_name", models.CharField(max_length=255)),
                ("job_title", models.CharField(blank=True, max_length=255)),
                ("start_date", models.DateField(blank=True, null=True)),
                ("end_date", models.DateField(blank=True, null=True)),
                (
                    "rating",
                    models.DecimalField(
                        blank=True,
                        decimal_places=1,
                        max_digits=2,
                        null=True,
                        validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(5)],
                    ),
                ),
                ("notes", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "employer",
                    models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="worker_history", to="users.employer"),
                ),
            ],
            options={
                "ordering": ["-start_date", "-created_at"],
            },
        ),
    ]
