# HyMedia Industry-Grade Implementation Status

Last verified: 2026-07-12

This document tracks the requested industry-grade checklist against the actual repository.

## Implemented In The Repo

- Short-lived access JWTs in HttpOnly cookies with rotating refresh sessions.
- Login rate limiting and account lockout after repeated failed attempts.
- Session/device listing and individual session revocation.
- Account data export and account deletion/anonymisation.
- Role-based access control for user, creator, moderator, organisation admin, platform admin, and legacy admin roles.
- Fine-grained permission matrix with permission-based route guards.
- Server-side asset ownership checks for update, delete, restore, purge, share-link creation, and share-link listing.
- Visibility model: public, private, unlisted, organisation-only, shared, and password-protected.
- Private/restricted media enforcement through API-streamed media access.
- Expiring, revocable, token-hashed share links that stream through the API.
- Server-generated unpredictable blob names.
- File extension, MIME, and magic-byte validation.
- Upload cleanup for temp files and compensating Blob cleanup when metadata creation fails.
- Asset owner fields persisted on records.
- Public update validation that rejects protected fields.
- Moderation states, report flow, moderator queue, moderator decisions, and audit records.
- Soft delete, recycle bin, restore, and permanent purge.
- Blob deletion on permanent purge.
- Request validation with Zod, including route parameter and query validation on asset, moderation, and admin routes.
- Optional Cosmos DB `If-Match` concurrency checks for asset update, soft delete, restore, and purge operations.
- Standard API error shape with machine-readable codes and request IDs.
- Structured request logging.
- Liveness, configuration health, and dependency readiness endpoints.
- Minimal OpenAPI discovery endpoint.
- Pagination limits on list-style endpoints.
- API rate limits for general, auth, and upload routes.
- Helmet security headers and explicit CORS allowlist.
- GitHub Actions build, syntax, test, audit, artifact, deploy, and smoke gates.
- Backend and frontend smoke tests.
- Dependency audits with zero current moderate-or-higher findings.
- Versioned release log and package versions.

## Partially Implemented

- Managed identity provider: local auth remains, but session security and permission enforcement have been hardened.
- Secure media delivery: API authorization exists; Azure private containers, SAS issuance, CDN, and Private Link require Azure configuration.
- Industrial uploads: validation and cleanup exist; direct-to-Blob resumable uploads and chunking are not yet implemented.
- Async media processing: processing state fields exist; worker pipeline/Event Grid/Functions are not implemented.
- Automated moderation: local policy checks exist; Azure AI Content Safety/OCR/speech moderation are not wired.
- Cosmos design: type discriminators and limits exist; partition-key redesign, index policy, change feed, backup, and failover are Azure/data-model work.
- OpenAPI: endpoint discovery exists; full schemas/examples/error responses are not complete.
- Frontend replacement: vanilla UI is improved; React/TypeScript migration is not done.
- Observability: structured logs and Application Insights bootstrap exist; dashboards, alerts, SLOs, and distributed worker tracing are not complete.
- Testing: smoke tests exist; integration, E2E, load, fuzz, accessibility, and chaos suites are not complete.

## Requires Azure/GitHub/External Setup

- Microsoft Entra External ID/Auth0, MFA, social login, email verification, password reset.
- Azure Key Vault references with Managed Identity.
- Private Blob/Cosmos endpoints, VNet integration, and public-network restrictions.
- Azure Front Door/CDN, WAF, custom domain, managed TLS, bot/DDoS controls.
- Service Bus/Event Grid/Functions or Container Apps worker deployment.
- Azure AI Content Safety, OCR, speech-to-text, and malware scanning services.
- Cosmos partition-key migration, indexing policy, continuous backup, point-in-time restore, multi-region failover.
- Staging/prod resource separation, deployment slots, health-gated slot swaps, rollback policies.
- Infrastructure as Code for all Azure resources.
- Branch protection, required reviewers, signed releases, SBOM and secret scanning policy.
- Cost budgets, dashboards, alerts, status page, runbooks, and incident processes.

## Current Release Focus

`1.3.0` adds account lifecycle, session management, expiring share links, recycle-bin asset lifecycle, safer internal update boundaries, and UI controls for these workflows.
