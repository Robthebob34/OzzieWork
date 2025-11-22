"""Simple data seeding script for local development."""
import os
import django
from django.utils import timezone

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend_project.settings")
os.environ.setdefault("PYTHONPATH", os.path.join(BASE_DIR, "packages", "backend"))

import sys

sys.path.append(os.path.join(BASE_DIR, "packages", "backend"))

django.setup()

from apps.users.models import User, Employer  # noqa: E402  pylint: disable=wrong-import-position
from apps.jobs.models import Job  # noqa: E402
from apps.applications.models import Application  # noqa: E402


def main():
    admin, _ = User.objects.get_or_create(
        username="admin",
        defaults={"email": "admin@example.com", "is_staff": True, "is_superuser": True},
    )
    admin.set_password("admin123")
    admin.save()

    employer_user, _ = User.objects.get_or_create(
        username="employer",
        defaults={"email": "employer@example.com", "is_employer": True},
    )
    employer_user.set_password("password123")
    employer_user.save()

    traveller, _ = User.objects.get_or_create(
        username="traveller",
        defaults={"email": "traveller@example.com", "is_traveller": True},
    )
    traveller.set_password("password123")
    traveller.save()

    employer, _ = Employer.objects.get_or_create(
        user=employer_user,
        defaults={"company_name": "Backpackers Co", "company_description": "Seasonal work"},
    )

    job, _ = Job.objects.get_or_create(
        title="Farm Hand",
        employer=employer,
        defaults={
            "description": "Assist with picking fruit for the harvest season.",
            "location": "Mildura, VIC",
            "hourly_rate": 28.5,
            "currency": "AUD",
            "start_date": timezone.now().date(),
        },
    )

    Application.objects.get_or_create(
        job=job,
        applicant=traveller,
        defaults={"cover_letter": "Keen worker with RSA and White Card."},
    )

    print("Seed data created ✅")


if __name__ == "__main__":
    main()
