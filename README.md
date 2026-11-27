# VAWES

VAWES is a music catalog and player built with a React/Vite frontend and an ASP.NET Core 10 API backed by MySQL.

## Contents

- `src/` — React application, contexts, pages and components
- `upload.html` — standalone administrator upload page
- `backend/Vawes/` — ASP.NET Core API
- `backend/Vawes.Tests/` — API integration tests
- `backend/*.sql` — database baseline and additive migrations

The catalog starts empty. Music enters it only through the administrator upload flow, which stores the audio file and its metadata together.

## Prerequisites

- Node.js 20+
- .NET SDK 10+
- Docker with Compose, or a local MySQL 8.4 instance

## Frontend setup

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Set `VITE_API_BASE_URL` in `.env.local` to the API base URL, including `/api`. Without it the app shows an empty catalog and authentication is unavailable.

`VITE_BASE_PATH` is only needed for deployments under a subpath, such as a GitHub Pages project site.

## Backend setup

1. Copy the environment template and fill in the values:

   ```bash
   cp backend/.env.example backend/.env
   ```

   `DATAPROTECTION_CERTIFICATE_PASSWORD` must match the password of `backend/secrets/dataprotection.pfx`. That certificate is intentionally gitignored and must be provisioned separately.

2. Start the stack:

   ```bash
   docker compose -f backend/docker-compose.yml up --build
   ```

   The API listens on `http://localhost:5121` and MySQL on `127.0.0.1:3307`.

### Database schema

For a new database, import the canonical baseline:

```bash
mysql -h 127.0.0.1 -P 3307 -u vawe -p vawe < backend/vawes.sql
```

The baseline already includes slugs, playlist positions and password-reset tokens. For databases created before those features, apply the additive migrations in this order:

```bash
mysql ... vawe < backend/catalog-schema.sql
mysql ... vawe < backend/playlist-order-schema.sql
mysql ... vawe < backend/password-reset-schema.sql
```

For databases created before the admin audit log, apply `backend/admin-audit-schema.sql`. Do not seed demo music — every catalog entry must have a real audio file.

## Administrator access

Administrator status requires both the `is_admin` database flag and an email listed in `Admin:AllowedEmails`. Sign in at `/admin/login` to reach the console at `/admin`, which provides an overview, catalog, artist, user, playlist, upload, audit and status tabs. Links are shareable via `?tab=...`.

Upload requires only an administrator session cookie — sign in at `/login` or `/admin/login` with an allowlisted admin account. No API key is needed. It is available inside the console and at the standalone `/upload.html` page.

## API documentation

With the API running, interactive documentation is available at `http://localhost:5121/scalar`. The raw OpenAPI document is served at `http://localhost:5121/openapi/v1.json`.

## Tests

```bash
npm test
npm run build
dotnet test backend/Vawes.Tests/Vawes.Tests.csproj
```

CI runs all three before deploying the static frontend to GitHub Pages.

## Deployment

`.github/workflows/static.yml` builds the frontend with `VITE_BASE_PATH` and `VITE_API_BASE_URL` repository variables, copies `dist/index.html` to `dist/404.html` for SPA route fallback, and publishes `dist/` to GitHub Pages. The API is deployed separately with `backend/docker-compose.yml`.
