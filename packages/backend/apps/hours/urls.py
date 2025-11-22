"""URL routes for hours tracking."""
from django.urls import path
from .views import HoursWorkedListCreateView, HoursWorkedDetailView

urlpatterns = [
    path("", HoursWorkedListCreateView.as_view(), name="hours-list"),
    path("<int:pk>/", HoursWorkedDetailView.as_view(), name="hours-detail"),
]
