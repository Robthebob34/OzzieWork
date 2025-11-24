from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("jobs", "0003_job_details_expansion"),
    ]

    operations = [
        migrations.AddField(
            model_name="job",
            name="location_region",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
        migrations.AddField(
            model_name="job",
            name="location_latitude",
            field=models.DecimalField(decimal_places=6, max_digits=9, blank=True, null=True),
        ),
        migrations.AddField(
            model_name="job",
            name="location_longitude",
            field=models.DecimalField(decimal_places=6, max_digits=9, blank=True, null=True),
        ),
    ]
