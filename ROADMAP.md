# HyMedia Industry Roadmap

Last updated: 10 July 2026

This roadmap turns HyMedia from a coursework MVP into a production-grade media platform. It is based on the current codebase plus the latest official guidance checked on 10 July 2026:

- OWASP ASVS 5.0.0 as the application security baseline: https://owasp.org/www-project-application-security-verification-standard/
- OWASP File Upload Cheat Sheet for upload validation and storage safety: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- OWASP REST Security Cheat Sheet for API authentication, JWT, CORS, rate limits, and transport security: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html
- Microsoft Azure App Service security guidance: https://learn.microsoft.com/en-us/azure/app-service/overview-security
- Microsoft Azure Blob Storage security recommendations: https://learn.microsoft.com/en-us/azure/storage/blobs/security-recommendations
- Microsoft Azure App Service deployment slots: https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots
- Microsoft Azure AI Content Safety: https://learn.microsoft.com/en-us/azure/ai-services/content-safety/overview
- GitHub Actions secure use guidance: https://docs.github.com/en/actions/reference/security/secure-use

## Target Position

HyMedia should become a secure, observable, scalable user-generated media platform with:

- Server-enforced privacy, ownership, and premium access.
- Safe file upload handling, malware/moderation scanning, and quarantine workflows.
- Reliable media delivery with thumbnails, adaptive video, cache/CDN support, and signed URLs.
- Production authentication using HttpOnly cookies, refresh-token rotation, account protection, and role-based access control.
- CI/CD with quality gates, staging validation, zero-downtime deployment, and rollback.
- A clear migration path away from Azure App Service if the platform moves to another cloud or container platform.

## Phase 0 - Repository And Deployment Hygiene

Status: in progress

Must ship before more feature work:

- Rename implementation folder to `Hymedia_codebase`.
- Keep source tree compact: `backend/`, `frontend/`, `.github/workflows/`, docs, and local-only deployment runbooks.
- Add `.gitignore` for secrets, dependency folders, build artifacts, and `Deployment-Details`.
- Update GitHub Actions path filters and working directories after the folder rename.
- Add a local deployment runbook with placeholders for resource IDs, secret names, and migration steps.
- Keep real secrets out of Git. Gitignored files are still local risk, so store live values in GitHub Secrets, Azure App Settings, Azure Key Vault, or a password manager.

Acceptance gates:

- `git status --ignored --short` shows `Deployment-Details` as ignored.
- Backend and frontend dependency installs complete.
- Backend and frontend start scripts are still valid from the renamed folder.

## Phase 1 - Security Hardening

Priority: critical

### Authentication And Sessions

- Use HttpOnly, Secure, SameSite cookies for auth state.
- Use short-lived access JWTs and rotating single-use refresh sessions stored hashed in Cosmos DB.
- Add session revocation on logout, replay detection, and device/session listing.
- Keep bcrypt password hashing with strong password validation.
- Add account lockout/backoff after repeated login failures.
- Add passkeys/WebAuthn as a future passwordless sign-in path, not as a blocker for the current project.

### Authorization

- Enforce ownership on every write route.
- Add roles: `user`, `creator`, `moderator`, `admin`.
- Enforce visibility server-side for `PUBLIC`, `UNLISTED_LINK`, `PRIVATE_SELECTED`, and `CREATOR_PREMIUM`.
- Return `403` for unauthorized metadata and direct media-stream requests.
- Add append-only audit records for login failures, role changes, asset deletes, moderation decisions, and entitlement changes.

### API Surface

- Keep schema validation at every route boundary.
- Add Helmet security headers and a strict content security policy for the frontend.
- Keep an explicit CORS allowlist. Do not use wildcard CORS with credentials.
- Apply separate rate limits for general API, auth routes, and upload routes.
- Add request IDs and structured JSON logs.
- Add pagination and response-size limits to list endpoints.

### File Upload Security

Implement OWASP-aligned upload controls:

- Allowlist file extensions and MIME types.
- Verify file signatures/magic bytes, not only browser-provided MIME types.
- Generate server-side blob names; never trust original filenames as storage paths.
- Enforce file size limits by tier and by endpoint.
- Store uploads outside executable paths. Keep Blob containers private.
- Scan files before publication. Until scanning exists, default suspicious files to private/quarantined.
- Strip risky metadata where appropriate, especially image GPS EXIF.
- Delete both blob and metadata on asset deletion, with a reconciliation job for orphan blobs.

## Phase 2 - Moderation And Trust

Priority: critical for user-generated media

- Integrate Azure AI Content Safety for text fields and images. It supports text and image analysis for harm categories such as sexual content, violence, hate, and self-harm.
- Store moderation scores, model version, threshold, and decision on each asset.
- Add moderation states: `pending`, `approved`, `sensitive`, `quarantined`, `removed`.
- Build a moderator queue for AI-quarantined and user-reported content.
- Add report flows for assets and comments.
- Apply server-side sensitive-content controls. Client blur is only presentation, not enforcement.
- Add policy pages: acceptable use, copyright/IP takedown, privacy, and moderation appeals.

## Phase 3 - Media Processing Pipeline

Priority: high

- Move expensive work off the request path using a queue and worker.
- Upload flow should create metadata with `processingStatus: pending`, store the original blob, enqueue work, and return quickly.
- Generate image thumbnails for gallery/detail views.
- Generate video poster frames and, later, HLS renditions for adaptive playback.
- Generate audio duration and waveform previews.
- Keep original files in private Blob Storage; serve authorized media through the API or short-lived signed URLs.
- Add retry/dead-letter handling and admin visibility for failed processing jobs.
- Use Blob lifecycle rules for old originals/renditions when business rules allow it.

## Phase 4 - Product Features

Priority: medium/high

### Core Media

- Advanced gallery search and filters: media type, tags, date, owner, visibility, sensitivity.
- Collections/albums with independent visibility.
- Bulk upload and bulk edit.
- Per-file upload progress and resumable/chunked upload for large files.
- Public profile pages for creators.

### Community

- Likes.
- Comments with moderation.
- Follows.
- Notifications for processing completion, comments, follows, reports, and moderation decisions.

### Creator And Premium

- Tier records on users.
- Quotas by tier: storage, max file size, upload rate, daily uploads, video quality.
- Creator premium visibility enforced by entitlement checks.
- Payment provider integration through hosted checkout and webhooks. No card data should touch HyMedia servers.
- Creator analytics: views, downloads/plays, watch time, engagement, and revenue.

## Phase 5 - Frontend Quality

Priority: high

- Keep the current vanilla frontend only if the interface stays small. If the UI grows, migrate to React/Vite or another maintainable component system.
- Add accessible modal behavior, visible focus states, keyboard support, semantic landmarks, and WCAG 2.2 AA contrast.
- Add loading skeletons and empty/error states.
- Add PWA manifest and service worker for cached shell and thumbnails.
- Store no long-lived tokens in `localStorage`.
- Add centralized API client logic with retry/refresh handling.
- Add Open Graph metadata for public assets if server-side rendering or pre-rendering is introduced.

## Phase 6 - Cloud Architecture And Operations

Priority: high

- Put Azure Front Door or another CDN/WAF layer in front of public traffic.
- Enable HTTPS-only and modern TLS on App Service.
- Use managed identity where possible.
- Move secrets to Azure Key Vault or GitHub/Azure secret stores. Avoid connection strings in code or checked-in files.
- Enable App Service diagnostics, Application Insights, and Azure Monitor alerts.
- Add health, readiness, and dependency checks.
- Add availability tests against frontend and backend.
- Add App Service deployment slots for staging and production swap.
- Disable basic publishing credentials where possible and prefer OIDC/least-privilege deployment.
- Add backup/restore documentation for Cosmos DB and Blob Storage.
- Add Azure budget alerts and resource tags.

## Phase 7 - CI/CD And Release Gates

Priority: critical before production claims

Add these gates to both backend and frontend workflows:

- `npm ci` instead of `npm install` for reproducible CI.
- Formatting/lint check.
- Unit tests.
- Integration/smoke tests against a staging slot.
- `npm audit` or an equivalent dependency vulnerability gate.
- Secret scanning and dependency review in GitHub.
- Manual approval before production deployment.
- Post-deploy smoke checks:
  - Frontend health route responds.
  - Backend `/api/v1/health` responds.
  - Auth signup/login works in staging test account.
  - Upload, stream, edit, and delete round trip works.
  - Delete leaves no orphan blob for the test asset.

## Migration Readiness

To avoid Azure lock-in, introduce these boundaries before migrating:

- Keep storage behind a `mediaStorage` service interface.
- Keep metadata behind repository/service interfaces.
- Keep auth/session logic independent of Azure SDKs.
- Keep environment variable names provider-neutral where possible.
- Containerize backend and frontend with Dockerfiles.
- Export infrastructure as code using Bicep, Terraform, or Pulumi.
- Document equivalent mappings:
  - Azure App Service -> AWS ECS/Fargate, Google Cloud Run, Render, Fly.io, Railway, or Kubernetes.
  - Azure Blob Storage -> AWS S3, Google Cloud Storage, Cloudflare R2, or MinIO.
  - Cosmos DB -> MongoDB Atlas, PostgreSQL, DynamoDB, Firestore, or managed Mongo-compatible stores.
  - Application Insights -> OpenTelemetry plus Datadog, Grafana Cloud, New Relic, or CloudWatch.
  - Azure Front Door -> Cloudflare, Fastly, AWS CloudFront, or Google Cloud CDN.

## Definition Of Industry Level

HyMedia should not be described as industry-level until all of these are true:

- No known critical/high dependency vulnerabilities.
- Auth tokens are HttpOnly cookies or equivalent secure storage.
- Authorization is enforced server-side on metadata and media bytes.
- Uploads are validated, size-limited, privately stored, and scanned or quarantined before publication.
- CI blocks deployment on failed quality gates.
- Staging deploys are validated before production.
- Monitoring and alerts exist for uptime, errors, latency, auth failures, and upload failures.
- Backup and restore procedures are documented and tested.
- A moderator/admin path exists for user-generated content abuse.
- Secrets are not stored in Git, README files, screenshots, or deployment artifacts.
