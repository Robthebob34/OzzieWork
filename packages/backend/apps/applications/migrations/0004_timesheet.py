from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("applications", "0003_joboffer"),
    ]

    operations = [
        migrations.CreateModel(
            name="Timesheet",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "status",
                    models.CharField(
                        choices=[("draft", "Draft"), ("submitted", "Submitted"), ("approved", "Approved")],
                        default="draft",
                        max_length=20,
                    ),
                ),
                ("traveller_notes", models.TextField(blank=True, default="")),
                ("employer_notes", models.TextField(blank=True, default="")),
                ("submitted_at", models.DateTimeField(blank=True, null=True)),
                ("approved_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "offer",
                    models.OneToOneField(
                        on_delete=models.deletion.CASCADE,
                        related_name="timesheet",
                        to="applications.joboffer",
                    ),
                ),
            ],
            options={
                "ordering": ["-updated_at"],
            },
        ),
        migrations.CreateModel(
            name="TimesheetEntry",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("entry_date", models.DateField()),
                ("hours_worked", models.DecimalField(decimal_places=2, max_digits=5)),
                ("notes", models.TextField(blank=True, default="")),
                (
                    "timesheet",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="entries",
                        to="applications.timesheet",
                    ),
                ),
            ],
            options={
                "ordering": ["entry_date"],
            },
        ),
        migrations.AlterUniqueTogether(
            name="timesheetentry",
            unique_together={("timesheet", "entry_date")},
        ),
    ]
