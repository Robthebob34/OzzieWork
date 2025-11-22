# Working Holiday Jobs

A monorepo scaffold for a Working Holiday Jobs platform. Includes:

- **packages/frontend**: Next.js 14 + Tailwind CSS PWA client
- **packages/backend**: Django 5 + DRF API service
- **docker-compose**: Dev orchestration for backend, frontend, Postgres, Adminer

## Getting Started

1. Copy `.env.example` to `.env` and fill values.
2. Install deps (`npm install` in `packages/frontend`, `pip install -r requirements.txt` in `packages/backend`).
3. Start services via Docker or run apps individually (see runbook below).

## Documentation

- `packages/backend/README.md` *(todo)*: deeper API notes
- `packages/frontend/README.md` *(todo)*: frontend conventions
- `scripts/seed.py`: quick data bootstrapper

## Status

This scaffold is intentionally minimal—extend models, validations, and UI flows before production.


Application PWA pour connecter backpackers (WHV) et employeurs en Australie
Frontend PWA : Next.js + React + Tailwind
Backend API : Django + Django REST Framework
Base de données : PostgreSQL
Paiements : Stripe Connect (stubs)

Table des matières

Vision & objectifs

Stack technique

Architecture générale

Modèles de données (Django ORM)

Endpoints REST principaux

Auth & sécurité

Paiements (Stripe Connect – flow)

PWA & expérience mobile

Développement local (docker-compose)

Scripts utiles

Roadmap & milestones

Tests & QA

Monitoring & metrics

Scalabilité & migration vers natif (React Native / Expo)

Conformité & légalité

Marketing / Go-to-market MVP

Annexes / .env.example

1. Vision & objectifs

Lancer rapidement un MVP permettant aux backpackers :

créer un profil, postuler à des jobs, indiquer leurs heures, recevoir paiement automatique.

Pour les employeurs :

poster jobs, valider heures, payer facilement.

Objectif business : tester traction, viser 2000€/mois via abonnements premium, commissions 1% sur paiements, partenariats assurance/tickets.

2. Stack technique

Frontend : Next.js 14 (TypeScript) + React + Tailwind

Backend : Django 5 + Django REST Framework

Base de données : PostgreSQL

Paiements : Stripe Connect (Express stubs remplacés par Django views)

Auth : JWT via SimpleJWT (refresh token flow)

PWA : manifest.json + service worker via next-pwa

Déploiement : Docker-compose pour dev, Vercel pour frontend, Render/Heroku pour backend

Tests : Pytest pour backend, Jest/Cypress pour frontend

3. Architecture générale
[Client - PWA Next.js] <----> [Backend Django REST API] <----> [PostgreSQL]
     |                                             \
     |                                              \---> [Stripe Connect]
     |
     +-- (Installable PWA, plus tard React Native mobile app)


Frontend → appelle API JSON REST

Backend → logique métier, auth, paiements, admin

Backend conçu pour être réutilisable par future app mobile native

4. Modèles de données (Django ORM)
Exemple minimal users/models.py :
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    role_choices = [('BACKPACKER', 'Backpacker'), ('EMPLOYER', 'Employer'), ('ADMIN', 'Admin')]
    role = models.CharField(max_length=20, choices=role_choices)
    tfn = models.CharField(max_length=20, blank=True, null=True)
    bank_account_token = models.CharField(max_length=255, blank=True, null=True)

Autres modèles :

Employer, Job, Application, HoursWorked, Payment, Certification

Relations OneToMany/ManyToMany selon besoins

Stripe token + heures + status des paiements

5. Endpoints REST principaux

/api/auth/register/ POST

/api/auth/login/ POST

/api/users/me/ GET/PUT

/api/jobs/ GET/POST

/api/jobs/<id>/ GET/PUT

/api/jobs/<id>/apply/ POST

/api/applications/me/ GET

/api/hours/ POST (backpacker)

/api/hours/<id>/validate/ POST (employer)

/api/payments/stripe/webhook/ POST

Tous endpoints protégés par JWT sauf liste jobs public.

6. Auth & sécurité

JWT + refresh token (SimpleJWT)

HTTPS obligatoire en production

CORS configuré côté backend

Validation input (DRF serializers)

Logs et monitoring (Sentry recommandé)

Gestion TFN / IBAN via tokenisation Stripe

7. Paiements (Stripe Connect)

Employer paie via Stripe → platform take commission → transfer vers backpacker

Webhooks Stripe pour updates paiement

Test mode Stripe pour MVP

8. PWA & expérience mobile

Layout mobile-first

Responsive + installable via manifest.json

Offline cache basique

Notifications push optionnelles (web push pour PWA, native push plus tard)

9. Développement local
docker-compose.yml

Postgres + Adminer + Backend Django + Frontend Next.js

Commandes
# Cloner repo
git clone <repo>
cd repo

# Copier .env
cp .env.example .env

# Lancer docker
docker-compose up --build

# Backend
cd packages/backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend
cd ../frontend
pnpm install
pnpm dev

10. Scripts utiles

python manage.py migrate

python manage.py createsuperuser

python manage.py seed (script seed initial data)

docker-compose up --build

pnpm dev frontend

11. Roadmap & milestones

Phase 0 (1–3 jours) : setup repo, DB, Notion/Trello, design rudimentaire
Milestone A (1–2 semaines) : Auth, profile, jobs, apply, hours, Stripe stubs
Milestone B (1 semaine) : PWA, responsive, seed data
Milestone C (1–2 semaines) : Pilot city, 5–10 employeurs, test marketing
Milestone D (ongoing) : Ratings, historique, insurance/tickets, analytics, push, apps natives

12. Tests & QA

Backend : Pytest, DRF tests

Frontend : Jest + Cypress / Playwright

Scénarios utilisateur pilot

13. Monitoring & metrics

MAU / DAU, jobs publiés, time-to-fill, paiements, conversion free → premium

14. Migration vers apps natives

Garder logique métier backend & dossier /core frontend

Frontend PWA → React Native + Expo

Backend reste identique (REST JSON)

15. Conformité & légalité

TFN / IBAN → tokenisation Stripe / stockage sécurisé

Privacy policy & Terms of Use obligatoires

Conformité Australian Privacy Act

16. Marketing MVP

Cibler auberges, FB WHV groups, hostels

Landing page + waitlist

Programme parrainage

Partenariats assurance/tickets

17. Annexes / .env.example
DATABASE_URL=postgres://postgres:password@db:5432/backpacker_db
DJANGO_SECRET_KEY=change_me
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000