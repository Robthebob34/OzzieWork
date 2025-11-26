from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("applications", "0001_initial"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="application",
            constraint=models.UniqueConstraint(
                fields=("job", "applicant"), name="unique_job_applicant_application"
            ),
        ),
    ]
