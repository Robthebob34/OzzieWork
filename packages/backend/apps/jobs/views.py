"""API views for jobs."""
from typing import Iterable

from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from .models import Job, JobStatus
from .serializers import JobSerializer
from .utils import geocode_query, haversine_km
from apps.users.utils import employer_compliance_gaps, ensure_employer_not_suspended


class JobListCreateView(generics.ListCreateAPIView):
    serializer_class = JobSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = Job.objects.all().select_related("employer", "created_by")
        request = getattr(self, "request", None)
        if request and request.method == "GET":
            params = request.query_params
            queryset = queryset.filter(is_live=True, status=JobStatus.ACTIVE)

            state = params.get("state")
            if state:
                queryset = queryset.filter(location_state__iexact=state)

            region = params.get("region")
            if region:
                queryset = queryset.filter(location_region__icontains=region)

            city = params.get("city")
            if city:
                queryset = queryset.filter(location_city__icontains=city)

        return queryset.order_by("-created_at")

    def perform_create(self, serializer):
        user = self.request.user
        if not getattr(user, "is_employer", False):
            raise PermissionDenied("Only employer accounts can post jobs.")

        ensure_employer_not_suspended(user)
        employer_profile, _ = user.employer_profile.__class__.objects.get_or_create(user=user)

        missing = employer_compliance_gaps(user)
        if missing:
            raise ValidationError(
                {
                    "detail": "Profil employeur incomplet : complétez vos informations avant de publier un job.",
                    "missing_fields": missing,
                    "redirect_url": "/employer/settings",
                }
            )

        serializer.save(created_by=user, employer=employer_profile)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        search_query = request.query_params.get("q")
        radius_param = request.query_params.get("radius_km")
        radius_km = 50.0
        if radius_param:
            try:
                radius_km = max(1.0, min(float(radius_param), 500.0))
            except (TypeError, ValueError):
                radius_km = 50.0

        jobs: Iterable[Job] = queryset
        search_coords = geocode_query(search_query) if search_query else None

        def matches_text(job: Job, query: str) -> bool:
            q = query.lower()
            fields = [
                job.location_city,
                job.location_state,
                job.location_region,
                job.location_address,
                job.location,
                job.title,
            ]
            return any((value or "").lower().find(q) != -1 for value in fields)

        if search_query:
            filtered = []
            if search_coords:
                search_lat, search_lon = search_coords
                for job in jobs:
                    if job.location_latitude is None or job.location_longitude is None:
                        if matches_text(job, search_query):
                            job.distance_km = None
                            filtered.append(job)
                        continue
                    distance = haversine_km(
                        float(job.location_latitude),
                        float(job.location_longitude),
                        search_lat,
                        search_lon,
                    )
                    if distance <= radius_km:
                        job.distance_km = round(distance, 2)
                        filtered.append(job)
                jobs = filtered
            else:
                jobs = [job for job in jobs if matches_text(job, search_query)]
        else:
            for job in jobs:
                job.distance_km = None

        page = self.paginate_queryset(list(jobs))
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(jobs, many=True)
        return Response(serializer.data)


class JobRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    queryset = Job.objects.all().select_related("employer", "created_by")
    serializer_class = JobSerializer

    def perform_update(self, serializer):
        user = self.request.user
        if not getattr(user, "is_employer", False):
            raise PermissionDenied("Only employer accounts can edit jobs.")

        ensure_employer_not_suspended(user)
        missing = employer_compliance_gaps(user)
        if missing:
            raise ValidationError(
                {
                    "detail": "Profil employeur incomplet : complétez vos informations avant de modifier ce job.",
                    "missing_fields": missing,
                    "redirect_url": "/employer/settings",
                }
            )

        serializer.save()


class EmployerJobListView(generics.ListAPIView):
    serializer_class = JobSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not getattr(user, "is_employer", False):
            raise PermissionDenied("Only employer accounts can view their job postings.")

        employer_profile, _ = user.employer_profile.__class__.objects.get_or_create(user=user)
        return employer_profile.jobs.order_by("-created_at")


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def featured_jobs(request):
    """Public endpoint returning latest 5 jobs."""

    jobs = Job.objects.order_by("-created_at")[:5]
    return Response(JobSerializer(jobs, many=True).data)
