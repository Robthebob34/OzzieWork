from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("jobs", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="job",
            name="status",
            field=models.CharField(
                choices=[("draft", "Draft"), ("active", "Active"), ("closed", "Closed")],
                default="draft",
                max_length=20,
            ),
        ),
    ]
