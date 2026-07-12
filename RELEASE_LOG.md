# HyMedia Release Log

## 1.4.0 - Permission and API hardening release

Date: 2026-07-12

Shipped:

- Added a fine-grained permission matrix for user, creator, moderator, organisation admin, platform admin, and legacy admin roles.
- Included effective permissions in sanitized users and short-lived access-token claims.
- Replaced hard-coded admin/moderator route checks with permission middleware.
- Added strict route parameter and query validation for asset, moderation, and admin routes.
- Added optional `If-Match` support for asset update, soft delete, restore, and purge operations using Cosmos DB access conditions.
- Added `ETag` response headers for single-asset reads and updates where Cosmos returns an `_etag`.
- Added asset response serialization so historical records no longer expose direct Blob Storage URLs, blob names, or Cosmos internal metadata.
- Changed media-stream cache headers so private, sensitive, adult, or owner-only responses are `private, no-store` while safe public media remains short-cacheable.
- Updated frontend role-aware controls to use permissions instead of only checking `admin` and `moderator` role strings.

Verification:

- Backend syntax: `npm run check`
- Backend tests: `npm test`
- Frontend syntax: `npm run check`
- Frontend tests: `npm test`

## 1.3.0 - Account lifecycle and sharing release

Date: 2026-07-12

Shipped:

- Added session/device listing and individual session revocation.
- Added account data export and account deletion/anonymisation endpoints.
- Added expiring, revocable, token-hashed share links for owned assets.
- Added shared media streaming through the API without exposing Blob URLs.
- Changed asset delete to soft delete with recycle-bin listing, restore, and permanent purge.
- Added permanent purge Blob cleanup.
- Split public asset updates from internal system/moderation updates.
- Added account operations UI for sessions, recycle bin, export, and delete account.
- Added owner share-link action in asset cards and detail views.
- Added status matrix for requested industry-grade capabilities.

Verification:

- Backend syntax: `npm run check`
- Backend tests: `npm test`
- Backend audit: `npm audit --audit-level=moderate`
- Frontend syntax: `npm run check`
- Frontend tests: `npm test`
- Frontend audit: `npm audit --audit-level=moderate`

## 1.2.0 - Production hardening release

Date: 2026-07-12

This release moves HyMedia from MVP-style behavior toward an operational media-management platform.

Shipped:

- Removed the source-code JWT fallback secret. `JWT_SECRET` is now required for auth token signing and verification.
- Added backend liveness, configuration health, dependency readiness, and a minimal OpenAPI discovery endpoint.
- Standardized API error responses with request IDs and machine-readable error codes.
- Tightened asset validation so clients cannot write storage, ownership, processing, counter, or moderation internals through public metadata routes.
- Normalized the real visibility model: public, private, unlisted, organisation-only, shared users, and password-protected.
- Stopped returning directly usable public blob URLs from uploaded asset records.
- Added compensating cleanup when Blob upload succeeds but Cosmos metadata creation fails.
- Added Helmet, request IDs, structured request logs, rate limits, auth lockout, rotating refresh sessions, audit events, moderation queue controls, and admin role management in the current application surface.
- Added backend `.env.example` with placeholders and kept real `.env` files ignored.
- Added npm overrides for patched OpenTelemetry packages used by Application Insights.
- Bumped backend and frontend packages to `1.2.0`.

Verification:

- Backend syntax: `npm run check`
- Backend tests: `npm test`
- Backend audit: `npm audit --audit-level=moderate`
- Frontend syntax: `npm run check`
- Frontend tests: `npm test`
- Frontend audit: `npm audit --audit-level=moderate`

Result:

- Backend checks passed.
- Backend tests passed: 7/7.
- Backend audit passed: 0 vulnerabilities.
- Frontend checks passed.
- Frontend tests passed: 5/5.
- Frontend audit passed: 0 vulnerabilities.
