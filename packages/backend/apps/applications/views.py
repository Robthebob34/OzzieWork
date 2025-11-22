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
        if user.is_staff:
            return Application.objects.select_related("job", "applicant")
        return Application.objects.filter(applicant=user).select_related("job")

    def perform_create(self, serializer):
        serializer.save(applicant=self.request.user)


class ApplicationDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated]
    queryset = Application.objects.select_related("job", "applicant")
