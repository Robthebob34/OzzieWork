# Guide d'installation et de lancement

> Ce document explique à ton/ta partenaire comment cloner, configurer et exécuter l'application Working Holiday Jobs (monorepo Next.js + Django + PostgreSQL).

## 1. Prérequis système
- **Git** ≥ 2.40
- **Node.js** 18.17 ou 20.x + **npm** (Next.js 14 l'exige)
- **Python** 3.11 + `pip` et (optionnel) `virtualenv`
- **PostgreSQL** 15 (serveur local ou via Docker)
- **Redis** : _non requis pour l'instant_
- **Docker & Docker Compose** (facultatif mais recommandé pour tout lancer d'un coup)
- **Stripe test keys** (si tu veux tester les webhooks)

## 2. Cloner le dépôt
```bash
git clone <URL_DU_REPO>
cd OzzieWork
```
Repère les deux sous-projets : `packages/frontend` (Next.js) et `packages/backend` (Django/DRF). @README.md#1-24

## 3. Configuration des variables d'environnement
1. Copie l'exemple global :
   ```bash
   cp .env.example .env
   ```
2. Ouvre `.env` et renseigne au minimum :
   ```env
   DJANGO_SECRET_KEY=remplacer_par_une_valeur_sûre
   DJANGO_DEBUG=true
   DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
   POSTGRES_DB=workholiday
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_HOST=localhost # ou "db" si tu utilises docker-compose
   POSTGRES_PORT=5432
   STRIPE_API_KEY=sk_test_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   STRIPE_CONNECT_CLIENT_ID=ca_xxx
   CORS_ALLOWED_ORIGINS=http://localhost:3000
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
   ```
   Ces variables sont lues par Django (`os.getenv(...)`) et par le frontend (`process.env.NEXT_PUBLIC_API_BASE_URL`). @README.md#68-155 @packages/backend/backend_project/settings.py#16-129 @packages/frontend/src/lib/api.ts#1-9
3. Ajoute un fichier `packages/frontend/.env.local` si tu veux surcharger côté Next.js :
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
   ```

## 4. Installation du backend (Django + DRF)
1. Dans un terminal :
   ```bash
   cd packages/backend
   python -m venv .venv && source .venv/bin/activate  # optionnel mais conseillé
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
2. Prépare la base PostgreSQL (si tu n'utilises pas Docker) : crée la base `workholiday` et assure-toi que l'utilisateur indiqué dans `.env` a les droits.
3. Applique les migrations et crée un superutilisateur :
   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   ```
4. (Optionnel) Charge des données de démo si un script `scripts/seed.py` est fourni :
   ```bash
   python manage.py runscript seed  # ou python scripts/seed.py selon ton setup
   ```
5. Lancer l'API en local :
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```

## 5. Installation du frontend (Next.js 14)
1. Dans un second terminal :
   ```bash
   cd packages/frontend
   npm install
   ```
2. Vérifie que `NEXT_PUBLIC_API_BASE_URL` pointe vers `http://localhost:8000/api` pour que le client parle à Django. @packages/frontend/src/lib/api.ts#1-9
3. Lancer l'UI :
   ```bash
   npm run dev
   ```
   L'application est accessible sur `http://localhost:3000`.

## 6. Lancement via Docker (option "tout-en-un")
1. À la racine du repo :
   ```bash
   docker-compose up --build
   ```
   - Services démarrés : `db` (PostgreSQL 15), `adminer` (UI DB), `backend` (Django), `frontend` (Next.js).
   - Accès :
     - API Django : http://localhost:8000/api
     - Frontend : http://localhost:3000
     - Postgres : port 5432
     - Adminer : http://localhost:8080 (login `postgres` / `postgres` par défaut)
   @docker-compose.yml#1-50
2. Pour arrêter : `Ctrl+C` puis `docker-compose down`.

## 7. Lancement manuel (sans Docker)
1. Assure-toi que PostgreSQL tourne localement.
2. Terminal A → backend : `cd packages/backend && source .venv/bin/activate && python manage.py runserver 0.0.0.0:8000`
3. Terminal B → frontend : `cd packages/frontend && npm run dev`
4. Terminal C (optionnel) → tests backend : `pytest` si configuré // frontend : `npm run test`.

## 8. Commandes utiles
- **Backend** :
  - `python manage.py makemigrations` / `migrate`
  - `python manage.py createsuperuser`
  - `python manage.py shell`
- **Frontend** :
  - `npm run lint`
  - `npm run test`
  - `npm run build && npm run start` pour simuler la prod
- **Qualité** : `npm run typecheck` (frontend), `pytest` (backend si ajouté)
- **Base de données** : accès Adminer via `http://localhost:8080`

## 9. Vérifications post-installation
1. Se connecter à l'admin Django : `http://localhost:8000/admin/` avec le superuser créé.
2. Depuis le frontend, tester la création d'un compte, la connexion et la consultation des offres.
3. Lancer quelques appels API avec `curl` ou `httpie` pour vérifier les statuts HTTP.
4. (Stripe) : configurer le `stripe listen --forward-to localhost:8000/api/payments/stripe/webhook/` si besoin.

## 10. Technologies principales
- **Frontend** : Next.js 14 (React 18, TypeScript), Tailwind CSS, SWR. @README.md#5-52 @packages/frontend/package.json#1-55
- **Backend** : Django 5, Django REST Framework, JWT (SimpleJWT), Stripe SDK, psycopg2. @README.md#5-95 @packages/backend/requirements.txt#1-9
- **Base de données** : PostgreSQL 15
- **Orchestration** : Docker Compose (dev)
- **Auth** : JWT Access + Refresh. @README.md#90-116
- **Paiements** : Stripe Connect (test stubs). @README.md#169-177

Ton/ta partenaire peut désormais cloner le dépôt et suivre ce guide pas à pas pour tout lancer immédiatement. Bon setup !
