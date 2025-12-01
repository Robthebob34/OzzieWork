"""URL routes for applications."""
from django.urls import path
from .views import (
    ApplicationListCreateView,
    ApplicationDetailView,
    ApplicationOfferView,
    EmployerWorkersView,
    TravellerJobsView,
    TimesheetView,
    TimesheetSubmitView,
    TimesheetApproveView,
    PayslipView,
    PayslipInstructionConfirmView,
)

urlpatterns = [
    path("", ApplicationListCreateView.as_view(), name="applications-list"),
    path("<int:pk>/", ApplicationDetailView.as_view(), name="applications-detail"),
    path("<int:pk>/offer/", ApplicationOfferView.as_view(), name="applications-offer"),
    path("my-workers/", EmployerWorkersView.as_view(), name="applications-my-workers"),
    path("my-jobs/", TravellerJobsView.as_view(), name="applications-my-jobs"),
    path("<int:pk>/timesheet/", TimesheetView.as_view(), name="applications-timesheet"),
    path("<int:pk>/timesheet/submit/", TimesheetSubmitView.as_view(), name="applications-timesheet-submit"),
    path("<int:pk>/timesheet/approve/", TimesheetApproveView.as_view(), name="applications-timesheet-approve"),
    path("<int:pk>/payslip/", PayslipView.as_view(), name="applications-payslip"),
    path(
        "<int:pk>/payslip/confirm-instructions/",
        PayslipInstructionConfirmView.as_view(),
        name="applications-payslip-confirm-instructions",
    ),
]
