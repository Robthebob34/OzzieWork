"""Views for logging hours."""
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .models import HoursWorked
from .serializers import HoursWorkedSerializer


class HoursWorkedListCreateView(generics.ListCreateAPIView):
    serializer_class = HoursWorkedSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_employer:
            return HoursWorked.objects.select_related("application", "worker")
        return HoursWorked.objects.filter(worker=user).select_related("application")

    def perform_create(self, serializer):
        serializer.save(worker=self.request.user)


class HoursWorkedDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = HoursWorkedSerializer
    permission_classes = [IsAuthenticated]
    queryset = HoursWorked.objects.select_related("application", "worker")
