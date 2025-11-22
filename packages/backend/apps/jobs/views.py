"""API views for jobs."""
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from .models import Job
from .serializers import JobSerializer


class JobListCreateView(generics.ListCreateAPIView):
    queryset = Job.objects.all().select_related("employer", "created_by")
    serializer_class = JobSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class JobRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    queryset = Job.objects.all().select_related("employer", "created_by")
    serializer_class = JobSerializer


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def featured_jobs(request):
    """Public endpoint returning latest 5 jobs."""

    jobs = Job.objects.order_by("-created_at")[:5]
    return Response(JobSerializer(jobs, many=True).data)
