# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

HyMedia is a cloud-native multimedia sharing platform built for the COM682 module. It uses a separated frontend/backend architecture, both deployed as Azure App Services with GitHub Actions CI/CD.

- **Live Frontend**: `https://hymedia-web.azurewebsites.net`
- **Live Backend API**: `https://hymedia-api-b00968573-ajegdnfpa9braqet.italynorth-01.azurewebsites.net`

## Development Commands

All work lives under `Hymedia_codebase/`.

**Backend** (port 5000):
```bash
cd Hymedia_codebase/backend
npm install
npm run dev       # nodemon hot-reload
npm start         # production
npm run check     # syntax check all JavaScript files
npm test          # node:test smoke tests
```

**Frontend** (port 3000):
```bash
cd Hymedia_codebase/frontend
npm install
npm start
npm run check     # syntax check all JavaScript files
npm test          # node:test smoke tests
```

**Health checks:**
```bash
curl http://localhost:3000/health
curl http://localhost:5000/api/v1/health
```

Automated smoke tests are configured with Node's built-in `node:test` runner.

## Architecture

### Backend (`backend/`)

Express 5 REST API following an MVC pattern:

- `server.js` — app entry point; registers CORS, JSON parser (10 MB limit), Application Insights, and mounts route groups
- `src/config/` — initializes Azure clients (Cosmos DB, Blob Storage, Application Insights) from env vars; imported once at startup
- `src/routes/` — thin route definitions that map HTTP verbs to controller methods
- `src/controllers/` — request/response handling and input validation
- `src/services/` — all Azure SDK calls live here; controllers never touch Azure SDKs directly
  - `blob.service.js` — upload/delete/stream from Azure Blob Storage
  - `cosmos-assets.service.js` — asset metadata CRUD in Cosmos DB
  - `users.service.js` — user records in a separate Cosmos DB container
  - `assets.memory.service.js` — in-memory fallback used when Azure is unavailable
- `src/middleware/auth.middleware.js` — verifies short-lived access JWTs from HttpOnly cookies or Bearer headers on protected routes
- `src/middleware/upload.middleware.js` — Multer instance for multipart file uploads

**API routes** (all prefixed `/api/v1`):
```
POST   /auth/signup          # register and set auth cookies
POST   /auth/login           # sign in and set auth cookies
POST   /auth/refresh         # rotate refresh session and renew access cookie
POST   /auth/logout          # revoke refresh session and clear cookies
GET    /auth/me              # requires auth
GET    /auth/sessions        # list active refresh sessions
DELETE /auth/sessions/:sessionId # revoke one refresh session
GET    /auth/export          # export account data
DELETE /auth/account         # delete/anonymise account
GET    /assets               # list all
GET    /assets/stats         # dashboard counts
GET    /assets/recycle-bin   # owner recycle bin
GET    /assets/share/:token/media # stream shared asset by token
GET    /assets/:id           # single asset metadata
GET    /assets/:id/media     # stream binary (supports Range header)
POST   /assets               # create metadata-only (auth required)
POST   /assets/upload        # upload file + metadata (auth required)
GET    /assets/:id/share-links # list owner share links
POST   /assets/:id/share-links # create expiring share link
DELETE /assets/share-links/:shareId # revoke share link
POST   /assets/:id/report    # report asset (auth required)
POST   /assets/:id/restore   # restore soft-deleted asset
DELETE /assets/:id/purge     # permanently delete metadata and linked blob
PUT    /assets/:id           # update metadata (auth required)
DELETE /assets/:id           # soft delete to recycle bin (auth required)
GET    /moderation/queue     # moderator/admin queue
POST   /moderation/:id/decision # moderator/admin decision
GET    /admin/users          # admin user list
PUT    /admin/users/:id/role # admin role update
```

### Frontend (`frontend/`)

- `server.js` — minimal Express static server; serves everything from its own directory with SPA fallback to `index.html`
- `index.html` — single-page app shell; all sections (gallery, upload form, moderation/admin panels, auth modal, edit modal, detail modal) are in one file
- `app.js` — all client-side logic in vanilla JavaScript; no framework. Auth state is held by HttpOnly cookies on the API side and current-user state in memory; all API calls use Fetch API with credentials included.
- `config.js` — sets `window.HYMEDIA_CONFIG.API_BASE_URL`; local frontend hosts (`localhost` and `127.0.0.1`) use `http://localhost:5000`, while deployed frontend traffic uses the Azure production API
- `styles.css` — CSS grid-based layout; no CSS framework

### CI/CD

Two independent GitHub Actions workflows in `.github/workflows/`:
- `main_hymedia-api-b00968573.yml` — triggers on changes to `Hymedia_codebase/backend/**`; deploys to `hymedia-api-b00968573` App Service using the backend publish profile secret
- `main_hymedia-web.yml` — triggers on changes to `Hymedia_codebase/frontend/**`; deploys to `hymedia-web` App Service using a publish profile secret

## Environment Variables

Backend requires a `.env` file (not committed):

```
NODE_ENV=
AZURE_STORAGE_CONNECTION_STRING=
AZURE_STORAGE_CONTAINER_NAME=media
COSMOS_ENDPOINT=
COSMOS_KEY=
COSMOS_DATABASE_NAME=hymedia-db
COSMOS_CONTAINER_NAME=assets
COSMOS_USERS_CONTAINER_NAME=users
APPINSIGHTS_CONNECTION_STRING=
JWT_SECRET=
```

## Key Conventions

- Backend uses CommonJS (`require`/`module.exports`); no ESM.
- Azure SDK clients are singletons instantiated in `src/config/` and imported by services.
- CORS is an explicit allowlist in `backend/server.js` (`localhost:3000`, `127.0.0.1:5500`, and the Azure frontend); requests from any other origin are rejected, so add new dev origins there.
- The `/assets/:id/media` endpoint reads the blob as a stream and supports `Range` headers for video seeking.
- Deleting an asset soft-deletes it into the recycle bin; permanent purge removes the Cosmos DB metadata record and attempts to delete the linked blob.
- Sensitive/18+ assets are stored normally; blur is applied client-side, while quarantined/removed media is enforced server-side.
- `CLAUDE.md` at the repo root is a duplicate of this file for Claude Code — mirror any changes made here into it.
