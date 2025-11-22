"""URL routes for job resources."""
from django.urls import path
from .views import JobListCreateView, JobRetrieveUpdateView, featured_jobs

urlpatterns = [
    path("", JobListCreateView.as_view(), name="jobs-list"),
    path("featured/", featured_jobs, name="jobs-featured"),
    path("<int:pk>/", JobRetrieveUpdateView.as_view(), name="jobs-detail"),
]
