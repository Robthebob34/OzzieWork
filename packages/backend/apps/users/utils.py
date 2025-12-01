"""Utility helpers for validating user compliance requirements."""
from __future__ import annotations

from typing import List

from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError


User = get_user_model()


def _clean(value: str | None) -> str:
    return (value or "").strip()


def traveller_compliance_gaps(user: User) -> List[dict]:
    if not getattr(user, "is_traveller", False):
        return []

    missing: List[dict] = []

    if not _clean(getattr(user, "tfn", "")):
        missing.append({"field": "tfn", "label": "TFN manquant"})

    bank_fields = [
        _clean(getattr(user, "bank_name", "")),
        _clean(getattr(user, "bank_bsb", "")),
        _clean(getattr(user, "bank_account_number", "")),
    ]
    if not all(bank_fields):
        missing.append({"field": "bank_details", "label": "Coordonnées bancaires manquantes"})

    if not _clean(getattr(user, "superannuation_account_number", "")):
        missing.append({"field": "super_account", "label": "Numéro de compte super manquant"})

    if not _clean(getattr(user, "superannuation_fund_name", "")):
        missing.append({"field": "super_fund", "label": "Nom du fonds de superannuation manquant"})

    return missing


def employer_compliance_gaps(user: User) -> List[dict]:
    if not getattr(user, "is_employer", False):
        return []

    employer_profile = getattr(user, "employer_profile", None)
    missing: List[dict] = []

    if not employer_profile:
        missing.append({"field": "employer_profile", "label": "Profil employeur inexistant"})
        return missing

    if not _clean(getattr(employer_profile, "company_name", "")):
        missing.append({"field": "company_name", "label": "Raison sociale manquante"})

    if not _clean(getattr(employer_profile, "abn", "")):
        missing.append({"field": "abn", "label": "ABN manquant"})

    address_parts = [
        _clean(getattr(employer_profile, "address_street", "")),
        _clean(getattr(employer_profile, "address_city", "")),
        _clean(getattr(employer_profile, "address_state", "")),
        _clean(getattr(employer_profile, "address_postcode", "")),
    ]
    if not all(address_parts):
        missing.append({"field": "company_address", "label": "Adresse complète de l'entreprise manquante"})

    return missing


SUSPENSION_MESSAGE = (
    "Votre accès à certaines fonctionnalités de recrutement est suspendu en raison d'un paiement en attente. "
    "Veuillez consulter votre tableau de bord des travailleurs et confirmer les virements en retard."
)


def ensure_employer_not_suspended(user: User) -> None:
    if not getattr(user, "is_employer", False):
        return

    employer_profile = getattr(user, "employer_profile", None)
    if employer_profile and employer_profile.is_suspended:
        raise ValidationError(
            {
                "detail": SUSPENSION_MESSAGE,
                "code": "employer_suspended",
                "redirect_url": "/employer/workers",
            }
        )


def unsuspend_employer_if_settled(employer) -> None:
    if not employer or not getattr(employer, "is_suspended", False):
        return

    from apps.applications.models import Payslip  # avoid circular import

    has_overdue = Payslip.objects.filter(employer=employer, status="overdue").exists()
    if has_overdue:
        return

    employer.is_suspended = False
    employer.save(update_fields=["is_suspended", "updated_at"] if hasattr(employer, "updated_at") else ["is_suspended"])
