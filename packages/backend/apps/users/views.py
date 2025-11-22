"""Views for user operations."""
from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .serializers import UserSerializer, EmployerSerializer
from .models import Employer

User = get_user_model()


class UserListView(generics.ListAPIView):
    """Admin-only list of users."""

    queryset = User.objects.all().prefetch_related("certifications")
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]


class UserMeView(generics.RetrieveUpdateAPIView):
    """Authenticated user profile endpoint."""

    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class EmployerListCreateView(generics.ListCreateAPIView):
    queryset = Employer.objects.all()
    serializer_class = EmployerSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def health(request):
    """Simple readiness endpoint useful for uptime checks."""

    return Response({"status": "ok"})
