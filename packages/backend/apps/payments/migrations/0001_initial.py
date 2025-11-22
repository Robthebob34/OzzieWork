from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("applications", "0001_initial"),
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="PayoutAccount",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("stripe_account_id", models.CharField(max_length=255)),
                ("onboarding_complete", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "employer",
                    models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="payout_account", to="users.employer"),
                ),
            ],
        ),
        migrations.CreateModel(
            name="Payment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("amount_cents", models.PositiveIntegerField()),
                ("currency", models.CharField(default="AUD", max_length=5)),
                ("stripe_payment_intent_id", models.CharField(blank=True, max_length=255)),
                ("stripe_transfer_id", models.CharField(blank=True, max_length=255)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("succeeded", "Succeeded"), ("failed", "Failed")], default="pending", max_length=32)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "application",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="payments", to="applications.application"),
                ),
            ],
        ),
    ]
