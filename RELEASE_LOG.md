# HyMedia Release Log

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
