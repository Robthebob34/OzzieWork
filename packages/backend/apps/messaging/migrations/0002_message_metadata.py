from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("messaging", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="message",
            name="message_type",
            field=models.CharField(default="text", max_length=32),
        ),
        migrations.AddField(
            model_name="message",
            name="metadata",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
