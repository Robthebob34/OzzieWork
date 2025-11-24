"""URL routes for job resources."""
from django.urls import path

from .views import EmployerJobListView, JobListCreateView, JobRetrieveUpdateView, featured_jobs

urlpatterns = [
    path("", JobListCreateView.as_view(), name="jobs-list"),
    path("mine/", EmployerJobListView.as_view(), name="jobs-mine"),
    path("featured/", featured_jobs, name="jobs-featured"),
    path("<int:pk>/", JobRetrieveUpdateView.as_view(), name="jobs-detail"),
]
