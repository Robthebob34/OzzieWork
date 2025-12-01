"""URL routes for user resources."""
from django.urls import path
from .views import (
    UserListView,
    UserMeView,
    EmployerListCreateView,
    EmployerProfileView,
    EmployerStatsView,
    RegisterView,
    LoginView,
    LogoutView,
    PasswordChangeView,
    PublicProfileView,
    TravellerDocumentListCreateView,
    TravellerDocumentDetailView,
    health,
)

urlpatterns = [
    path("", UserListView.as_view(), name="users-list"),
    path("me/", UserMeView.as_view(), name="users-me"),
    path("employers/", EmployerListCreateView.as_view(), name="employers"),
    path("employers/profile/", EmployerProfileView.as_view(), name="employers-profile"),
    path("employers/stats/", EmployerStatsView.as_view(), name="employers-stats"),
    path("profiles/<int:pk>/", PublicProfileView.as_view(), name="public-profile"),
    path("auth/register/", RegisterView.as_view(), name="users-register"),
    path("auth/login/", LoginView.as_view(), name="users-login"),
    path("auth/logout/", LogoutView.as_view(), name="users-logout"),
    path("auth/password-change/", PasswordChangeView.as_view(), name="users-password-change"),
    path("documents/", TravellerDocumentListCreateView.as_view(), name="traveller-documents"),
    path("documents/<int:pk>/", TravellerDocumentDetailView.as_view(), name="traveller-document-detail"),
    path("health/", health, name="users-health"),
]
