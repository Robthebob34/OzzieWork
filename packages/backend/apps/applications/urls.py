"""URL routes for applications."""
from django.urls import path
from .views import ApplicationListCreateView, ApplicationDetailView

urlpatterns = [
    path("", ApplicationListCreateView.as_view(), name="applications-list"),
    path("<int:pk>/", ApplicationDetailView.as_view(), name="applications-detail"),
]
