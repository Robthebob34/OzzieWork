"""Custom middleware for enforcing authentication on protected API routes."""
from django.conf import settings
from django.http import JsonResponse


class ProtectedAPIMiddleware:
    """Ensure protected API endpoints return consistent 401 responses."""

    def __init__(self, get_response):
        self.get_response = get_response
        self.protected_prefixes = tuple(getattr(settings, "AUTH_PROTECTED_PATH_PREFIXES", []))

    def __call__(self, request):
        if self._is_protected(request.path):
            if request.user.is_authenticated:
                return self.get_response(request)
            auth_header = request.META.get("HTTP_AUTHORIZATION")
            if not auth_header:
                return JsonResponse({"detail": "Authentication credentials were not provided."}, status=401)
            # Allow request to proceed so DRF's authentication classes can run.
            return self.get_response(request)
        return self.get_response(request)

    def _is_protected(self, path: str) -> bool:
        return any(path.startswith(prefix) for prefix in self.protected_prefixes)
