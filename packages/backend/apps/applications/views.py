"""Application API views."""
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Application
from .serializers import ApplicationSerializer


class ApplicationListCreateView(generics.ListCreateAPIView):
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Application.objects.select_related("job", "applicant", "job__employer__user")

        if user.is_staff:
            pass
        elif getattr(user, "is_employer", False):
            queryset = queryset.filter(job__employer__user=user)
        else:
            queryset = queryset.filter(applicant=user)

        job_id = self.request.query_params.get("job_id")
        if job_id:
            try:
                queryset = queryset.filter(job_id=int(job_id))
            except (TypeError, ValueError):
                queryset = queryset.none()

        return queryset

    def perform_create(self, serializer):
        serializer.save(applicant=self.request.user)


class ApplicationDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated]
    queryset = Application.objects.select_related("job", "applicant")
