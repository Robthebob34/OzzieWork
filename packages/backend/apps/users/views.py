"""Views for user operations."""
from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    EmployerSerializer,
    EmployerProfileSerializer,
    LoginSerializer,
    LogoutSerializer,
    PasswordChangeSerializer,
    RegisterSerializer,
    UserSerializer,
    PublicUserSerializer,
    JobHistorySerializer,
    PublicProfileSerializer,
    TravellerDocumentSerializer,
    build_auth_response,
)
from .models import Employer, JobHistory, TravellerDocument
from apps.jobs.models import Job, JobStatus
from apps.jobs.serializers import JobSerializer

User = get_user_model()


class UserListView(generics.ListAPIView):
    """Admin-only list of users."""

    queryset = User.objects.all().prefetch_related("certifications")
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]


class UserMeView(generics.RetrieveUpdateAPIView):
    """Authenticated user profile endpoint."""

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "patch", "put"]

    def get_object(self):
        return self.request.user


class EmployerListCreateView(generics.ListCreateAPIView):
    queryset = Employer.objects.all()
    serializer_class = EmployerSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class EmployerProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = EmployerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        user = self.request.user
        if not getattr(user, "is_employer", False):
            raise PermissionDenied("Only employers can access this resource.")
        employer_profile, _ = Employer.objects.get_or_create(user=user)
        return employer_profile


class EmployerStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if not getattr(user, "is_employer", False):
            raise PermissionDenied("Only employers can access this resource.")

        employer_profile, _ = Employer.objects.get_or_create(user=user)
        jobs = Job.objects.filter(employer=employer_profile).order_by("-created_at")
        active_jobs = jobs.filter(status=JobStatus.ACTIVE)
        draft_jobs = jobs.filter(status=JobStatus.DRAFT)
        closed_jobs = jobs.filter(status=JobStatus.CLOSED)

        def serialize_jobs(qs):
            return JobSerializer(qs, many=True).data

        recent_comments = []
        for history in employer_profile.worker_history.all()[:5]:
            if history.notes:
                recent_comments.append(
                    {
                        "worker_name": history.worker_name,
                        "notes": history.notes,
                        "rating": history.rating,
                        "start_date": history.start_date,
                        "end_date": history.end_date,
                    }
                )

        payload = {
            "counts": {
                "total": jobs.count(),
                "active": active_jobs.count(),
                "draft": draft_jobs.count(),
                "closed": closed_jobs.count(),
            },
            "active_jobs": serialize_jobs(active_jobs),
            "draft_jobs": serialize_jobs(draft_jobs),
            "closed_jobs": serialize_jobs(closed_jobs),
            "average_rating": employer_profile.average_rating,
            "rating_count": employer_profile.rating_count,
            "recent_comments": recent_comments,
        }
        return Response(payload)


class JobHistoryViewSet(generics.ListCreateAPIView):
    serializer_class = JobHistorySerializer

    def get_queryset(self):
        return JobHistory.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class PublicProfileView(generics.RetrieveAPIView):
    queryset = User.objects.select_related("employer_profile").prefetch_related("job_history", "certifications")
    serializer_class = PublicProfileSerializer
    permission_classes = [permissions.IsAuthenticated]


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def health(request):
    """Simple readiness endpoint useful for uptime checks."""

    return Response({"status": "ok"})


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(build_auth_response(user), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        return Response(build_auth_response(user), status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        refresh_token = serializer.validated_data["refresh"]
        from rest_framework_simplejwt.tokens import RefreshToken
        from rest_framework_simplejwt.exceptions import TokenError

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            return Response({"detail": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_205_RESET_CONTENT)


class PasswordChangeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password updated"}, status=status.HTTP_200_OK)


class TravellerDocumentListCreateView(generics.ListCreateAPIView):
    serializer_class = TravellerDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        return TravellerDocument.objects.filter(owner=user).order_by("-created_at")

    def perform_create(self, serializer):
        user = self.request.user
        file_obj = self.request.FILES.get("file")
        if not file_obj:
            raise ValidationError({"file": "A file upload is required."})
        serializer.save(
            owner=user,
            uploaded_by=user,
            mime_type=file_obj.content_type or "",
            size_bytes=file_obj.size or 0,
        )


class TravellerDocumentDetailView(generics.DestroyAPIView):
    serializer_class = TravellerDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return TravellerDocument.objects.filter(owner=self.request.user)
