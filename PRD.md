# HyMedia 2.0 — Product Requirements Document

| | |
|---|---|
| **Product** | HyMedia — Cloud-Native Multimedia Sharing Platform |
| **Document version** | 2.0 (Draft) |
| **Author** | Abdulrehman Mohamedrafiq Vohra (B00968573) |
| **Date** | 12 July 2026 |
| **Status** | Proposed — for review |
| **Baseline** | HyMedia 1.3.0 (COM682 CW2, deployed on Azure) |

---

## 1. Executive Summary

HyMedia 1.3.0 proved the core cloud-native loop: upload media to Azure Blob Storage, store metadata in Cosmos DB, stream it back through a cookie-protected Express API, and deploy everything through GitHub Actions. HyMedia 2.0 evolves the platform into a **creator-grade media platform** built around four pillars, each grounded in current (2026) industry direction:

1. **Trust & Security** — passkey-first authentication, hardened API surface, and server-side content protection.
2. **Intelligent Media Pipeline** — asynchronous processing, AI moderation, auto-tagging, adaptive streaming, and CDN delivery.
3. **Next-Generation UX** — calm, adaptive, accessible interfaces with real personalization instead of visual theatrics.
4. **Creator Economy & Bundles** — tiered subscriptions, premium content, and engagement features that turn viewers into communities.

The creator economy is projected to exceed **$250B globally in 2026**, with 200M+ people identifying as creators, and subscriptions now beating ad revenue for income stability ([Access Newswire](https://www.accessnewswire.com/newsroom/en/business-and-professional-services/creator-economy-statistics-2026-120-data-points-every-marketer-s-1148465), [Venture Lab](https://venture-lab.org/2026/creator-economy-trends-2026/)). HyMedia 2.0 positions the platform to serve that market while remaining a showcase of Azure-native architecture.

---

## 2. Background & Current State

### What exists today (v1.3.0)

- Separated frontend (vanilla JS SPA on Azure App Service) and backend (Express 5 REST API on Azure App Service).
- Media binaries in a **private** Blob container (`media`); metadata and users in Cosmos DB (`assets`, `users`).
- Email/password auth with bcrypt hashing, short-lived access cookies, rotating refresh cookies, session listing and revocation.
- Upload, gallery, detail view, metadata edit, soft delete, recycle-bin restore, permanent purge, share links and range-request video streaming.
- Local moderation status controls, moderator/admin queues, role management, request validation, rate limiting and security headers.
- Application Insights telemetry; two GitHub Actions deployment workflows with syntax checks, tests, audits, deploy and live health smoke checks.

### Remaining gaps

| Gap | Impact |
|---|---|
| No passkeys, email verification or password reset | Account recovery and phishing resistance remain incomplete |
| No processing pipeline (thumbnails, transcodes) | Slow galleries, no adaptive playback |
| No external AI moderation or auto-tagging | Moderation and discovery rely on local/manual controls |
| Advanced visibility and premium entitlement rules are not complete | Creator/private access promises need stronger enforcement |
| No search beyond basic listing, no likes/comments, no creator monetisation | Low engagement and retention ceiling |
| No scheduled blob reconciliation job | Permanent purge attempts blob cleanup, but there is no independent orphan audit |

HyMedia 2.0 addresses every remaining row of this table.

---

## 3. Goals & Non-Goals

### Goals

- **G1**: Make phishing-resistant, passwordless sign-in the default path (passkeys), with password fallback.
- **G2**: Enforce content privacy and sensitivity **server-side**; no security decision lives only in the browser.
- **G3**: Move media processing off the request path into an event-driven pipeline (queue + Azure Functions).
- **G4**: Cut media time-to-first-frame by ≥ 50% via thumbnails, adaptive bitrate (HLS), and CDN caching.
- **G5**: Launch a three-tier monetization model (Free / Plus / Creator Pro) with premium content gating.
- **G6**: Ship engagement primitives — likes, comments, follows, collections — with moderation controls.
- **G7**: Reach WCAG 2.2 AA accessibility and installable PWA status.

### Non-Goals (v2.0)

- Native mobile apps (the PWA is the mobile story for this release).
- Live streaming / real-time broadcast.
- Payment processing beyond a single provider integration (multi-PSP is v3).
- Federated/social login providers beyond passkeys + email (OAuth social login is a fast-follow).
- On-platform ad marketplace.

---

## 4. Users & Personas

| Persona | Description | Primary needs |
|---|---|---|
| **Casual Viewer** (“Maya”) | Browses public media, rarely uploads | Fast gallery, great search, safe-content defaults, no account friction |
| **Hobbyist Uploader** (“Dev”) | Shares photos/clips with friends | One-tap passkey login, private/selected sharing that actually works, easy organization |
| **Professional Creator** (“Lena”) | Monetizes photography & video tutorials | Premium gating, subscriber management, analytics, reliable video quality, burnout-reducing workflow tools |
| **Moderator/Admin** (“Sam”) | Keeps the platform safe | Moderation queue, AI-flag triage, audit trail, role-based permissions |

Note on creator wellbeing: 78% of creators report burnout affecting motivation ([Access Newswire](https://www.accessnewswire.com/newsroom/en/business-and-professional-services/creator-economy-statistics-2026-120-data-points-every-marketer-s-1148465)) — Lena's workflows (scheduled publishing, bulk actions, analytics digests) are designed to reduce repetitive platform labor, not add to it.

---

## 5. Market & Trend Context (2026)

- **Ownership beats attention**: subscriptions outperform ad revenue for stability; creators diversify across platforms to reduce algorithm risk ([Venture Lab](https://venture-lab.org/2026/creator-economy-trends-2026/), [ThoughtLeaders](https://www.thoughtleaders.io/blog/creator-economy-trends-2026)).
- **Passkeys are mainstream**: Apple, Google, and Microsoft ship full WebAuthn support with cross-device credential sync; the 2026 guidance for new apps is passkey-primary with OTP/magic-link fallback ([Corbado](https://www.corbado.com/blog/passkeys-prf-webauthn), [Security Boulevard](https://securityboulevard.com/2026/03/the-developers-practical-guide-to-passwordless-authentication-in-2026/), [LoginRadius](https://www.loginradius.com/blog/identity/passwordless-and-mfa)).
- **AI moderation is table stakes**: Azure AI Content Safety moderates text, images, and video with configurable severity thresholds and custom categories ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/ai-services/content-safety/overview), [OneUptime guide](https://oneuptime.com/blog/post/2026-02-16-content-moderation-user-generated-media-azure-content-safety/view)).
- **UX has shifted to “calm + adaptive”**: 2026 trends favor cognitive clarity over visual theatrics, real-time contextual adaptation, transparent AI, and trust-driven UX over growth hacks ([Envato](https://elements.envato.com/learn/ux-ui-design-trends), [UX Collective](https://uxdesign.cc/the-most-popular-experience-design-trends-of-2026-3ca85c8a3e3d), [Figma](https://www.figma.com/resource-library/web-design-trends/)).
- **Streaming is segment-based + CDN-cached**: HLS/DASH with adaptive bitrate and sprite-sheet scrub thumbnails is the standard delivery model ([Dacast](https://www.dacast.com/blog/adaptive-bitrate-streaming/), [VdoCipher](https://www.vdocipher.com/blog/cloud-video-streaming-platform/)).
- **Freemium wins for creator tools**: ~78% of successful creator tools use freemium; good-better-best tiering with outcome-led framing is the dominant pattern ([Revenera](https://www.revenera.com/blog/software-monetization/saas-pricing-models-guide/), [Moesif](https://www.moesif.com/blog/technical/api-development/SaaS-Pricing-Models/)).
- **API security focus is resource consumption**: OWASP API Top 10 emphasizes unrestricted resource consumption; baseline guidance is ~100 req/15 min general, ~10 req/15 min on auth routes, with schema validation at the boundary ([OWASP API Security](https://owasp.org/API-Security/), [StackHawk](https://www.stackhawk.com/blog/nodejs-api-security-best-practices/)).

---

## 6. Feature Requirements

Requirements use MoSCoW priority: **M** (Must), **S** (Should), **C** (Could).

### Epic A — Next-Level Security & Identity

> Pillar: Trust & Security. Closes every auth gap in v1 and aligns with 2026 passwordless-first guidance.

| ID | Requirement | Priority |
|---|---|---|
| A1 | **Passkey registration & login** (WebAuthn/FIDO2): users can create a passkey at signup or add one later; login supports discoverable credentials (“Sign in with a passkey”) | M |
| A2 | **Passkey-first flow with fallback**: passkey is the promoted path; email + password (bcrypt) remains as fallback; email magic-link as secondary fallback | M |
| A3 | **Session hardening extension**: keep short-lived access cookies + rotating refresh cookies, then add email verification, password reset, richer device trust metadata and admin session policy controls | M |
| A4 | **Rate limiting extension**: keep `express-rate-limit`; add per-user upload quotas by tier and tighter burst controls for auth and share-link endpoints | M |
| A5 | **Security headers extension**: keep `helmet`, frame denial and CORS allowlist; tune CSP/HSTS for production custom domains and CDN delivery | M |
| A6 | **Input validation at the boundary**: schema validation (e.g., Zod/Joi) on every route before controller logic; rejects mass assignment and type coercion | M |
| A7 | **Role-based access control (RBAC)**: roles `user`, `creator`, `moderator`, `admin` stored on the user record and embedded in token claims; route-level guards | M |
| A8 | **Server-side visibility enforcement**: `PUBLIC`, `PRIVATE_SELECTED`, `UNLISTED_LINK` (signed, expiring share URLs), `CREATOR_PREMIUM` all enforced in the media/metadata endpoints — never client-side | M |
| A9 | **Blob lifecycle integrity**: keep recycle-bin delete/restore and permanent purge blob cleanup; add nightly reconciliation to detect and clean orphaned blobs | M |
| A10 | **Audit log**: append-only Cosmos container recording auth events, role changes, deletions, and moderation actions | S |
| A11 | **Secrets to Azure Key Vault** with App Service managed identity; remove all secrets from App Service settings | S |
| A12 | **Passkey-derived encryption (PRF extension)** for a future “private vault” of end-to-end-encrypted assets | C |
| A13 | **Anomaly alerts**: App Insights alert rules for auth-failure spikes and 4xx/5xx bursts | S |

**Acceptance criteria (highlights)**
- A registered passkey signs the user in on a second device via platform credential sync without re-registration.
- A request for a `CREATOR_PREMIUM` asset's media by a non-subscriber returns `403` — including direct `GET /assets/:id/media` calls.
- Deleting an asset leaves zero blobs behind (verified by the nightly reconciliation report showing 0 orphans).

---

### Epic B — Intelligent Media Pipeline

> Pillar: Intelligent Media. Moves processing off the request path and adds AI understanding of content.

| ID | Requirement | Priority |
|---|---|---|
| B1 | **Queue-based processing**: upload saves blob + `processingStatus: "pending"` metadata, then enqueues a message (Azure Storage Queue); an Azure Function processes asynchronously — upload response returns immediately | M |
| B2 | **Thumbnail generation**: images get 3 sizes (card, detail, micro); videos get a poster frame + scrub sprite sheet | M |
| B3 | **AI content moderation** (Azure AI Content Safety): every upload scanned across hate/violence/sexual/self-harm categories with configurable severity thresholds; scores stored on the asset | M |
| B4 | **Moderation outcomes**: below threshold → published; mid-band → auto-flagged `sensitive` (server-side blur enforcement); above threshold → quarantined into moderator queue, hidden from all feeds | M |
| B5 | **AI auto-tagging** (Azure AI Vision): generated tags saved alongside user tags, visually distinguished, removable by the owner | S |
| B6 | **Video transcoding to HLS**: multi-rendition adaptive-bitrate ladder (e.g., 480p/720p/1080p) with `.m3u8` manifests stored in Blob; player falls back to progressive MP4 range streaming for unprocessed items | S |
| B7 | **CDN delivery**: Azure Front Door/CDN in front of the media endpoint with signed short-TTL URLs for private content | S |
| B8 | **Processing status UX**: gallery cards show live processing state (pending → processing → ready/failed) via polling or SSE | M |
| B9 | **Audio enrichment**: waveform image + duration extraction for audio assets | C |
| B10 | **Speech-to-text captions** (Azure Speech) for video/audio, stored as WebVTT and rendered in the player — an accessibility multiplier | C |
| B11 | **EXIF hygiene**: strip GPS/location EXIF on upload by default (owner can opt to keep) | S |

**Acceptance criteria (highlights)**
- Uploading a 200 MB video returns an API response in < 3 s; the asset appears in the gallery in “processing” state.
- An image scoring high in a harmful category never appears in any public feed and shows in the moderator queue within 60 s of upload.
- Video playback adapts quality on simulated network throttling without user intervention.

---

### Epic C — Next-Generation User Experience

> Pillar: UX. Applies 2026's “calm interface, transparent AI, contextual adaptation” direction.

| ID | Requirement | Priority |
|---|---|---|
| C1 | **Calm redesign**: reduced visual noise, consistent 8-pt spacing system, motion limited to purposeful transitions; respects `prefers-reduced-motion` | M |
| C2 | **Skeleton loading + optimistic UI**: gallery renders skeleton cards instantly; likes/edits apply optimistically with rollback on failure | M |
| C3 | **Personalized home feed**: “For You” ordering from the user's tags, follows, and view history; clearly labeled and switchable back to chronological (transparent-AI principle) | S |
| C4 | **Adaptive context**: time-of-day theme adaptation (auto dark/light), resumable “continue watching” row, recent-search recall | S |
| C5 | **Progressive Web App**: installable manifest, service worker with offline gallery shell and cached thumbnails, share-target support (share an image *to* HyMedia from the OS) | S |
| C6 | **WCAG 2.2 AA**: full keyboard navigability, visible focus, ARIA landmarks/labels, 4.5:1 contrast, captions support, no keyboard traps in modals | M |
| C7 | **Upload experience 2.0**: drag-and-drop multi-file upload with per-file progress, client-side preview, resumable chunked uploads for files > 50 MB | S |
| C8 | **Collections/albums**: users group assets into shareable collections with their own visibility settings | S |
| C9 | **Smart search UX**: instant-search box with suggestions, filter chips (type/tags/date/creator), and empty-state guidance | M |
| C10 | **Conversational assistant** (“Ask HyMedia”): natural-language search and help (“show my beach videos from March”) powered by Azure AI Search + LLM; opt-in and clearly labeled as AI | C |
| C11 | **Notification center**: in-app notifications for comments, follows, moderation outcomes, and processing completion | S |

**Acceptance criteria (highlights)**
- Lighthouse: Performance ≥ 90, Accessibility ≥ 95, PWA installable badge earned.
- Feed personalization can be disabled in one click and the choice persists.
- A keyboard-only user can complete signup → upload → edit → delete without a mouse.

---

### Epic D — Creator Economy, Monetization & Bundles

> Pillar: Creator Economy. Freemium good-better-best tiering, outcome-led ([Revenera](https://www.revenera.com/blog/software-monetization/saas-pricing-models-guide/), [Cobloom](https://www.cobloom.com/blog/saas-pricing-models)).

#### D-Bundles: Subscription tiers

| | **Free** | **HyMedia Plus** | **Creator Pro** |
|---|---|---|---|
| Price | £0 | £4.99/mo | £14.99/mo (or £149/yr) |
| Storage | 2 GB | 50 GB | 500 GB |
| Max file size | 100 MB | 1 GB | 5 GB |
| Uploads/day | 10 | 100 | Unlimited |
| Video quality | 720p | 1080p adaptive | 4K adaptive + priority transcoding |
| Collections | 3 | Unlimited | Unlimited |
| Premium content gating | — | — | ✅ Sell subscriber-only content |
| Subscriber management & payouts | — | — | ✅ |
| Analytics | Basic counts | Engagement trends | Full dashboard + export |
| AI auto-tagging | ✅ | ✅ | ✅ + custom tag vocabularies |
| Captions (speech-to-text) | — | ✅ | ✅ |
| Support | Community | Email | Priority |

Freemium principle: the Free tier must let users **genuinely succeed** (upload, share, stream) — payment triggers when needs grow, not from engineered frustration ([Moesif](https://www.moesif.com/blog/technical/api-development/SaaS-Pricing-Models/)).

| ID | Requirement | Priority |
|---|---|---|
| D1 | **Tier engine**: user record carries `tier`; middleware enforces storage/size/daily-upload quotas per tier | M |
| D2 | **Creator premium content**: Creator Pro users mark assets `CREATOR_PREMIUM`; viewers subscribe to a creator to unlock (enforced server-side per A8) | M |
| D3 | **Creator subscriptions**: monthly creator-set price (£1.99–£19.99); platform fee 10%; subscription records + status in Cosmos DB | M |
| D4 | **Payment integration**: single PSP (Stripe) for tier upgrades and creator subscriptions; webhooks update entitlements; no card data touches HyMedia servers | M |
| D5 | **Creator analytics dashboard**: views, watch time, likes, follower growth, revenue; weekly email digest (burnout-friendly: insights pushed, not hunted) | S |
| D6 | **Tipping** (“Support this creator”): one-off payments on any asset from a supported creator | C |
| D7 | **Promotional bundles**: annual billing at ~2 months free; seasonal launch offers (creator tools spike Q4/Q1 per [InfluenceFlow](https://influenceflow.io/resources/saas-pricing-page-best-practices-complete-guide-for-2026/)) | C |
| D8 | **Grace & downgrade logic**: expired subscriptions get a 7-day grace period; over-quota accounts become read-only for uploads, never deleted | M |

---

### Epic E — Community & Engagement

| ID | Requirement | Priority |
|---|---|---|
| E1 | **Likes**: like/unlike on assets; counts denormalized on the asset record | M |
| E2 | **Comments**: threaded one-level comments; owners and moderators can remove; AI text moderation (Content Safety) pre-screens | M |
| E3 | **Follows**: follow creators; followed content feeds the personalized home row | S |
| E4 | **User profiles**: public profile page — avatar, bio, public assets, follower count; private fields editable by owner | M |
| E5 | **Reporting**: any viewer can report an asset/comment with a reason; reports feed the moderation queue | M |
| E6 | **Moderator console**: queue of AI-quarantined + user-reported items with approve/blur/remove/ban actions and an audit trail (per A10) | M |
| E7 | **Popularity sorting**: “Trending” gallery sort using a time-decayed engagement score | C |

---

### Epic F — Search, Discovery & Data

| ID | Requirement | Priority |
|---|---|---|
| F1 | **Azure AI Search index** over asset metadata (title, caption, tags incl. AI tags, creator, location) with typo tolerance and relevance ranking | S |
| F2 | **Faceted filtering**: media type, tags, date range, creator, visibility (own content) | M |
| F3 | **Semantic/vector search** (“sunset over water”) via embeddings — pairs with C10 assistant | C |
| F4 | **Sitemap + share cards**: public assets get Open Graph/Twitter card metadata for rich link previews | S |

---

### Epic G — Platform, Observability & Ops

| ID | Requirement | Priority |
|---|---|---|
| G1 | **CI quality gates**: lint (ESLint) + unit tests (Jest/Vitest) + `npm audit` in both workflows; deployment blocked on failure — v1 currently has zero tests | M |
| G2 | **Integration test suite** against a staging slot: auth flows, upload→process→stream round-trip, visibility enforcement | S |
| G3 | **Staging environment**: App Service deployment slots with swap-on-approve | S |
| G4 | **App Insights dashboards**: upload funnel, processing latency, moderation outcomes, error budget; availability tests on `/health` | M |
| G5 | **Cost governance**: Azure budget alerts, resource tagging, Blob lifecycle rules (cool tier after 90 days of no access; orphan cleanup from A9) | S |
| G6 | **Structured logging**: request-ID correlation from frontend → API → Function for traceability | S |

---

## 7. Technical Architecture (Target State)

```text
                         ┌───────────────────────────────┐
 User ── HTTPS ──▶ Azure Front Door / CDN ──▶ Frontend App Service (PWA)
                         │                               │
                         │            REST + cookies (HttpOnly refresh)
                         ▼                               ▼
                  Backend API App Service (Express 5, helmet, rate limits, RBAC)
                   │        │           │            │
                   │        │           │            └──▶ Azure AI Search (index)
                   │        │           └──▶ Stripe (webhooks → entitlements)
                   │        └──▶ Cosmos DB (assets · users · subscriptions ·
                   │                        comments · audit · sessions)
                   ▼
            Azure Blob Storage (private: originals · renditions · thumbnails · HLS)
                   │
             Storage Queue ──▶ Azure Functions (processing worker)
                                  ├─ thumbnails / sprite sheets
                                  ├─ HLS transcode ladder
                                  ├─ Azure AI Content Safety (moderation)
                                  ├─ Azure AI Vision (auto-tags)
                                  └─ Azure Speech (captions)  ──▶ update Cosmos
                   
   Key Vault (secrets, managed identity) · Application Insights (end-to-end traces)
```

**Notable decisions**

- Backend stays Express 5/CommonJS (continuity with v1); the processing worker is a new Azure Functions app (Node) sharing a `packages/shared` validation/model layer.
- WebAuthn server-side via `@simplewebauthn/server`; passkey credentials stored in a new `credentials` Cosmos container keyed by user.
- HLS packaging via ffmpeg in the Function (Premium plan for CPU); progressive MP4 retained as universal fallback.
- Media URLs move to short-lived signed URLs (SAS) issued by the API after authorization, so the CDN can cache while privacy holds.

---

## 8. API Additions (summary)

```
POST   /auth/passkey/register/options     # WebAuthn registration challenge
POST   /auth/passkey/register/verify
POST   /auth/passkey/login/options        # WebAuthn auth challenge
POST   /auth/passkey/login/verify
POST   /auth/refresh                      # rotate refresh token (cookie)
POST   /auth/logout                       # revoke session

GET    /users/:id/profile                 # public profile
PUT    /users/me/profile
POST   /creators/:id/subscribe            # creator subscription (Stripe)
GET    /me/entitlements

POST   /assets/:id/like        DELETE /assets/:id/like
POST   /assets/:id/comments    GET /assets/:id/comments   DELETE /comments/:id
POST   /assets/:id/report
GET    /assets/:id/share-link             # signed UNLISTED_LINK URL

GET    /search?q=&type=&tags=&from=&to=   # AI Search-backed
GET    /moderation/queue                  # moderator+
POST   /moderation/:id/decision           # approve | blur | remove | ban

POST   /billing/checkout                  # tier upgrade session
POST   /billing/webhook                   # Stripe events
```

All new write endpoints: schema-validated (A6), rate-limited (A4), RBAC-guarded (A7).

---

## 9. Success Metrics

| Metric | Baseline (v1) | Target (v2, 90 days post-launch) |
|---|---|---|
| Median gallery load (LCP) | ~3–4 s (full-size images) | < 1.5 s (thumbnails + CDN) |
| Video time-to-first-frame | Progressive full-file | < 2 s on 4G (HLS) |
| Passkey adoption among active users | 0% | ≥ 40% |
| Harmful content reaching public feeds | Unmeasured | < 0.1% of published assets; 100% of quarantines triaged < 24 h |
| Orphaned blobs | Growing | 0 (nightly reconciliation) |
| Free → paid conversion | n/a | ≥ 3% |
| Creator retention (M1) | n/a | ≥ 60% |
| Lighthouse Accessibility | Unmeasured | ≥ 95 |
| Deployment failures caught pre-prod | 0 (no tests) | 100% of gate-failing builds blocked |

---

## 10. Rollout Plan

| Phase | Scope | Duration |
|---|---|---|
| **P1 — Harden** | Epic A (A1–A9), G1, blob-delete fix, quotas scaffold | 4 wks |
| **P2 — Pipeline** | Epic B (B1–B5, B8, B11), processing UX | 4 wks |
| **P3 — Experience** | Epic C (C1, C2, C6, C9 first), E1/E2/E4/E5 | 4 wks |
| **P4 — Monetize** | Epic D (tiers, Stripe, premium gating), E6 console | 4 wks |
| **P5 — Delight** | HLS (B6/B7), PWA (C5), search (F1/F2), personalization (C3/C4), analytics (D5) | 4 wks |

Each phase ships behind feature flags; staging slot swap with smoke tests gates production.

---

## 11. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Passkey unfamiliarity causes signup drop-off | Medium | Passkey-first but never passkey-only; contextual education UI; fallback always visible |
| Transcoding costs balloon | Medium | Ladder capped by tier (720p free); Functions Premium autoscale limits; cost alerts (G5) |
| AI moderation false positives frustrate creators | Medium | Mid-band flags blur rather than block; human appeal path via moderator console; thresholds tuned in shadow mode first |
| Stripe/webhook complexity delays P4 | Medium | Entitlement checks isolated behind one module; sandbox-mode integration tests |
| Scope exceeds coursework/solo capacity | High | MoSCoW priorities; every phase independently shippable; C/Could items pre-approved to slip |
| Session-policy changes log everyone out | Low | Keep refresh-session rotation backward compatible during each rollout window |

---

## 12. Open Questions

1. Should creator payouts (D3) use Stripe Connect Express in v2, or ledger-only with manual payouts until volume justifies Connect?
2. Is 10% the right platform fee at launch, or should early creators get a 0% promotional year to seed supply?
3. Do we need geo-restrictions/age-verification for 18+ content beyond blur + account age flag before enabling premium adult-adjacent categories — or exclude them from monetization entirely at launch? *(Recommendation: exclude at launch.)*
4. PWA push notifications (web push) in P5 or defer to v2.1?
5. Which region pair for Front Door origin failover, given the API currently runs single-region in Italy North?

---

## 13. Sources

**Creator economy & monetization**
- [Creator Economy Statistics 2026 — Access Newswire](https://www.accessnewswire.com/newsroom/en/business-and-professional-services/creator-economy-statistics-2026-120-data-points-every-marketer-s-1148465)
- [12 Creator Economy Trends in 2026 — Venture Lab](https://venture-lab.org/2026/creator-economy-trends-2026/)
- [Creator Economy Trends and Predictions for 2026 — ThoughtLeaders](https://www.thoughtleaders.io/blog/creator-economy-trends-2026)
- [7 Most Profitable Platforms for Creators in 2026 — Forbes](https://www.forbes.com/sites/meggenharris/2026/03/25/7-of-the-most-profitable-platforms-for-creators-in-2026--how-they-pay/)

**Security & identity**
- [Passkeys & WebAuthn in 2026: Migration Playbook — Medium](https://kawaldeepsingh.medium.com/passkeys-webauthn-in-2026-a-practical-migration-playbook-for-passwordless-authentication-5202f09c62a3)
- [Developer's Guide to Passwordless Authentication 2026 — Security Boulevard](https://securityboulevard.com/2026/03/the-developers-practical-guide-to-passwordless-authentication-in-2026/)
- [Passkeys & WebAuthn PRF for E2E Encryption — Corbado](https://www.corbado.com/blog/passkeys-prf-webauthn)
- [Passwordless & MFA in 2026 — LoginRadius](https://www.loginradius.com/blog/identity/passwordless-and-mfa)
- [Enable WebAuthn Passkeys — Microsoft Learn](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/passkeys/?view=aspnetcore-10.0)
- [OWASP API Security Top 10](https://owasp.org/API-Security/)
- [Node.js API Security Best Practices — StackHawk](https://www.stackhawk.com/blog/nodejs-api-security-best-practices/)
- [Node.js Security: OWASP Best Practices 2026 — HireNodeJS](https://www.hirenodejs.com/blog/nodejs-security-best-practices-2026)

**AI moderation**
- [What is Azure AI Content Safety — Microsoft Learn](https://learn.microsoft.com/en-us/azure/ai-services/content-safety/overview)
- [Azure AI Content Safety — Microsoft Azure](https://azure.microsoft.com/en-us/products/ai-services/ai-content-safety)
- [Content Moderation for User-Generated Media — OneUptime](https://oneuptime.com/blog/post/2026-02-16-content-moderation-user-generated-media-azure-content-safety/view)

**UX & design**
- [UX/UI Design Trends for 2026 — Envato](https://elements.envato.com/learn/ux-ui-design-trends)
- [Most Popular Experience Design Trends of 2026 — UX Collective](https://uxdesign.cc/the-most-popular-experience-design-trends-of-2026-3ca85c8a3e3d)
- [Top Web Design Trends for 2026 — Figma](https://www.figma.com/resource-library/web-design-trends/)
- [AI in UX/UI Design Trends 2026 — Veza Digital](https://www.vezadigital.com/post/ai-ux-ui-design-trends)
- [Top UX Design Trends in 2026 — UX Design Institute](https://www.uxdesigninstitute.com/blog/the-top-ux-design-trends-in-2026/)

**Streaming & delivery**
- [Adaptive Bitrate Streaming (2026 Update) — Dacast](https://www.dacast.com/blog/adaptive-bitrate-streaming/)
- [Cloud Video Streaming in 2026 — VdoCipher](https://www.vdocipher.com/blog/cloud-video-streaming-platform/)
- [System Design: Video Streaming — techinterview.org](https://www.techinterview.org/post/3233474186/system-design-video-streaming-netflix-adaptive-bitrate-hls-dash-transcoding-cdn-recommendation-engine-microservices/)
- [CDN for Video Streaming — OneUptime](https://oneuptime.com/blog/post/2026-01-28-cdn-video-streaming/view)

**Pricing & bundles**
- [SaaS Pricing Models: 2026 Guide — Revenera](https://www.revenera.com/blog/software-monetization/saas-pricing-models-guide/)
- [SaaS Pricing Models: 7 Strategies (2026) — Moesif](https://www.moesif.com/blog/technical/api-development/SaaS-Pricing-Models/)
- [SaaS Pricing Page Best Practices 2026 — InfluenceFlow](https://influenceflow.io/resources/saas-pricing-page-best-practices-complete-guide-for-2026/)
- [Guide to SaaS Pricing Models — Cobloom](https://www.cobloom.com/blog/saas-pricing-models)
