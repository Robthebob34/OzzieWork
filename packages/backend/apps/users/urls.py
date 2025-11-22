"""URL routes for user resources."""
from django.urls import path
from .views import UserListView, UserMeView, EmployerListCreateView, health

urlpatterns = [
    path("", UserListView.as_view(), name="users-list"),
    path("me/", UserMeView.as_view(), name="users-me"),
    path("employers/", EmployerListCreateView.as_view(), name="employers"),
    path("health/", health, name="users-health"),
]
