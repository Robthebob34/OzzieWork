"""Tests for authentication API endpoints."""
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class AuthAPITests(APITestCase):
    def setUp(self):
        self.register_url = reverse("users-register")
        self.login_url = reverse("users-login")
        self.logout_url = reverse("users-logout")
        self.me_url = reverse("users-me")

    def _create_user(self, **extra):
        defaults = {
            "email": "traveller@example.com",
            "username": "traveller@example.com",
            "password": "SecurePass123!",
            "is_traveller": True,
        }
        defaults.update(extra)
        user = get_user_model().objects.create_user(**defaults)
        return user

    def _auth_headers(self, access_token: str):
        return {"HTTP_AUTHORIZATION": f"Bearer {access_token}"}

    def test_register_returns_tokens_and_profile(self):
        payload = {
            "email": "new.user@example.com",
            "password": "StrongPass123!",
            "confirm_password": "StrongPass123!",
            "role": "traveller",
            "first_name": "New",
            "last_name": "User",
        }

        response = self.client.post(self.register_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("tokens", response.data)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"]["email"], payload["email"].lower())

    def test_register_rejects_duplicate_email(self):
        self._create_user()
        payload = {
            "email": "traveller@example.com",
            "password": "StrongPass123!",
            "confirm_password": "StrongPass123!",
            "role": "traveller",
        }

        response = self.client.post(self.register_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_login_returns_tokens_for_valid_credentials(self):
        self._create_user()
        payload = {"email": "traveller@example.com", "password": "SecurePass123!"}

        response = self.client.post(self.login_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("tokens", response.data)
        self.assertIn("user", response.data)

    def test_login_rejects_invalid_password(self):
        self._create_user()
        payload = {"email": "traveller@example.com", "password": "WrongPass"}

        response = self.client.post(self.login_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    def test_logout_with_invalid_token_returns_400(self):
        self._create_user()
        login = self.client.post(
            self.login_url,
            {"email": "traveller@example.com", "password": "SecurePass123!"},
            format="json",
        )
        access = login.data["tokens"]["access"]

        response = self.client.post(
            self.logout_url,
            {"refresh": "not-a-valid-refresh"},
            format="json",
            **self._auth_headers(access),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    def test_me_endpoint_requires_authentication(self):
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_endpoint_returns_profile_for_authenticated_user(self):
        self._create_user()
        login = self.client.post(
            self.login_url,
            {"email": "traveller@example.com", "password": "SecurePass123!"},
            format="json",
        )
        access = login.data["tokens"]["access"]

        response = self.client.get(self.me_url, **self._auth_headers(access))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "traveller@example.com")
