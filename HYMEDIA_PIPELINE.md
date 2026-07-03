# HyMedia Project Pipeline

This document explains how HyMedia works end to end: local development, frontend runtime, backend API, authentication, media upload, Azure storage, metadata persistence, and CI/CD deployment.

## 1. System Overview

HyMedia is a cloud-native Digital Asset Management platform with two deployable applications:

- Frontend App Service: `hymedia-web`
- Backend API App Service: `hymedia-api-b00968573`

The frontend is a vanilla JavaScript single-page app. The backend is an Express 5 REST API. Binary media files are stored in Azure Blob Storage, while users, sessions, and asset metadata are stored in Azure Cosmos DB.

```text
Browser
  |
  | HTTPS + HttpOnly cookies
  v
Azure App Service: hymedia-web
  |
  | Fetch API calls
  v
Azure App Service: hymedia-api-b00968573
  |
  | metadata/users/sessions
  v
Azure Cosmos DB
  |
  | media binaries
  v
Azure Blob Storage
  |
  | telemetry
  v
Application Insights
```

## 2. Repository Layout

```text
CW2_HyMedia_Implementation/
  backend/
    server.js
    src/
      config/
      controllers/
      middleware/
      routes/
      services/
      validators/
  frontend/
    server.js
    index.html
    app.js
    config.js
    styles.css
.github/workflows/
  main_hymedia-api-b00968573.yml
  main_hymedia-web.yml
```

## 3. Local Development Pipeline

Backend:

```bash
cd CW2_HyMedia_Implementation/backend
npm install
npm run dev
```

Frontend:

```bash
cd CW2_HyMedia_Implementation/frontend
npm install
npm start
```

Local URLs:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:5000/api/v1/health`

The frontend config automatically uses `http://localhost:5000` when running on localhost. In Azure, it uses the deployed backend URL.

## 4. Authentication Pipeline

HyMedia uses cookie-based authentication with short-lived JWT access tokens and rotating single-use refresh tokens.

### Signup

```text
User submits signup form
  |
  v
Frontend validates password confirmation
  |
  v
POST /api/v1/auth/signup
  |
  v
Zod validates display name, email, and password strength
  |
  v
Backend checks duplicate email in Cosmos DB
  |
  v
Password is hashed with bcrypt
  |
  v
User record is stored in Cosmos DB
  |
  v
Backend creates:
  - short-lived JWT access cookie
  - single-use refresh token session in Cosmos DB
  |
  v
Browser receives HttpOnly cookies
```

Passwords must:

- Be at least 10 characters.
- Include lowercase, uppercase, number, and symbol.
- Avoid using the email local-part.
- Avoid using display-name parts.

### Login

```text
User submits email/password
  |
  v
POST /api/v1/auth/login
  |
  v
Backend validates payload
  |
  v
Backend checks account lockout status
  |
  v
bcrypt compares password with stored hash
  |
  v
Failed attempts increment lockout counter
  |
  v
Successful login resets failed attempts
  |
  v
Backend issues HttpOnly access and refresh cookies
```

Brute-force protection:

- Auth routes are rate limited.
- Failed login attempts are tracked per user.
- Repeated failures temporarily lock the account.

### Refresh

```text
Access cookie expires
  |
  v
Frontend request receives 401
  |
  v
Frontend calls POST /api/v1/auth/refresh
  |
  v
Backend reads refresh cookie
  |
  v
Backend verifies session exists in Cosmos DB
  |
  v
Backend compares hashed refresh secret
  |
  v
Old refresh token is burned
  |
  v
New refresh token is issued and stored hashed
  |
  v
New access cookie is issued
```

Refresh tokens are single-use. If an old refresh token is replayed, the session is revoked.

### Logout

```text
User clicks sign out
  |
  v
POST /api/v1/auth/logout
  |
  v
Refresh session is revoked in Cosmos DB
  |
  v
Auth cookies are cleared
```

## 5. Authorization Pipeline

Users can see public assets from other users, but can only modify their own assets.

```text
Request reaches protected route
  |
  v
Auth middleware reads access cookie
  |
  v
JWT is verified
  |
  v
req.user is populated
  |
  v
Controller loads asset from Cosmos DB
  |
  v
Controller checks:
  - ownerId matches req.user.userId
  - or user role is admin
  |
  v
Only owner/admin may edit or delete
```

Visibility rules:

- `PUBLIC`: visible to everyone.
- `UNLISTED_LINK`: viewable if the asset URL is known.
- `PRIVATE_SELECTED`: visible to owner/admin only in the current implementation.
- `CREATOR_PREMIUM`: visible to owner/admin only until subscription checks are added.

## 6. Upload Pipeline

```text
Signed-in user selects or drops a media file
  |
  v
Frontend sends multipart form-data to POST /api/v1/assets/upload
  |
  v
Auth middleware verifies user
  |
  v
Upload rate limiter checks request volume
  |
  v
Multer accepts exactly one file into temporary storage
  |
  v
Backend validates:
  - file size
  - field count
  - field size
  - file extension
  - browser-reported MIME type
  - actual file signature using file-type
  |
  v
Backend uploads binary file to Azure Blob Storage
  |
  v
Backend creates metadata record in Cosmos DB
  |
  v
Frontend refreshes asset gallery
```

Current allowed media categories:

- Images: JPEG, PNG, GIF, WebP
- Video: MP4, MOV, WebM
- Audio: MP3, WAV, OGG

The Blob container remains private. The frontend does not directly read from Blob Storage.

## 7. Media Streaming Pipeline

```text
Browser requests /api/v1/assets/:assetId/media
  |
  v
Backend loads asset metadata from Cosmos DB
  |
  v
Backend checks visibility and ownership
  |
  v
Backend reads Blob properties
  |
  v
If Range header exists:
    return partial stream with 206
Else:
    return full stream with 200
```

Range support is required for video seeking and browser media playback.

## 8. Metadata Pipeline

Asset metadata lives in Cosmos DB and includes:

- `assetId`
- `title`
- `caption`
- `mediaType`
- `mimeType`
- `fileName`
- `blobName`
- `tags`
- `location`
- `visibility`
- `isSensitive`
- `isAdult18Plus`
- `ownerId`
- `ownerEmail`
- timestamps

Metadata updates are owner/admin-only and validated before write.

## 9. Delete Pipeline

```text
Owner/admin requests DELETE /api/v1/assets/:assetId
  |
  v
Backend loads metadata from Cosmos DB
  |
  v
Backend verifies owner/admin permission
  |
  v
Backend deletes linked Blob if present
  |
  v
Backend deletes Cosmos DB metadata
```

This prevents the earlier MVP problem where deleting metadata left orphaned Blob files.

## 10. Frontend Runtime Pipeline

On page load:

```text
Browser loads frontend assets
  |
  v
app.js calls /auth/me with cookies
  |
  v
If access cookie expired, app.js calls /auth/refresh
  |
  v
Frontend stores only user profile in memory
  |
  v
Frontend loads health, stats, and visible assets
```

The frontend no longer stores JWTs in `localStorage`.

Owner-only UI:

- Edit/delete buttons render only when the current user owns the asset or is admin.
- Non-owners see public assets in view-only mode.
- Backend authorization still enforces the rule even if the UI is bypassed.

## 11. Security Layers

Current security controls:

- bcrypt password hashing.
- Strong password validation.
- Personal-info password rejection.
- JWT access cookies with short expiry.
- HttpOnly refresh cookies.
- Rotating single-use refresh tokens.
- Refresh token hashing in Cosmos DB.
- Session revocation on logout.
- Account lockout after repeated failed logins.
- Auth route rate limiting.
- General API rate limiting.
- Upload route rate limiting.
- Helmet security headers.
- Strict CORS allowlist.
- Credentialed CORS for cookies.
- Owner/admin authorization checks.
- Private Blob container.
- Backend-mediated media streaming.
- File extension, MIME, and signature validation on upload.
- Single-file upload limit.
- Field count and field size limits.

## 12. CI/CD Pipeline

There are two GitHub Actions workflows:

- Backend: `.github/workflows/main_hymedia-api-b00968573.yml`
- Frontend: `.github/workflows/main_hymedia-web.yml`

### Backend CI/CD

```text
Push to main touching backend files
  |
  v
GitHub Actions checks out repo
  |
  v
Node.js 24 is installed
  |
  v
npm install runs in backend folder
  |
  v
npm run build --if-present
  |
  v
npm run test --if-present
  |
  v
Backend artifact is uploaded
  |
  v
Deploy job downloads artifact
  |
  v
Artifact is zipped
  |
  v
Kudu ZipDeploy deploys to Azure App Service
```

### Frontend CI/CD

```text
Push to main touching frontend files
  |
  v
GitHub Actions checks out repo
  |
  v
Node.js 24 is installed
  |
  v
npm install runs in frontend folder
  |
  v
npm run build --if-present
  |
  v
npm run test --if-present
  |
  v
Frontend artifact is uploaded
  |
  v
Deploy job downloads artifact
  |
  v
Artifact is zipped
  |
  v
Kudu ZipDeploy deploys to Azure App Service
```

The deployment workflows use GitHub repository secrets containing App Service publish profiles. Azure App Service SCM publishing must remain enabled for Kudu ZipDeploy.

## 13. Runtime Environment Variables

Backend environment variables are configured in Azure App Service settings:

```env
NODE_ENV=production
AZURE_STORAGE_CONNECTION_STRING=...
AZURE_STORAGE_CONTAINER_NAME=media
COSMOS_ENDPOINT=...
COSMOS_KEY=...
COSMOS_DATABASE_NAME=hymedia-db
COSMOS_CONTAINER_NAME=assets
COSMOS_USERS_CONTAINER_NAME=users
APPINSIGHTS_CONNECTION_STRING=...
JWT_SECRET=...
```

Secrets must not be committed to Git.

## 14. Current Production URLs

- Frontend: `https://hymedia-web.azurewebsites.net`
- Backend: `https://hymedia-api-b00968573-ajegdnfpa9braqet.italynorth-01.azurewebsites.net`
- Backend health: `https://hymedia-api-b00968573-ajegdnfpa9braqet.italynorth-01.azurewebsites.net/api/v1/health`

## 15. Known Next Architecture Steps

The current system is stronger than the MVP, but the next major upgrades should be:

- Add automated backend and frontend tests.
- Add pagination to asset listing.
- Add Azure AI Search for scalable metadata search.
- Add background media processing with Azure Functions.
- Generate thumbnails instead of loading full-size originals in the gallery.
- Add malware scanning or content moderation before publishing.
- Move secrets to Azure Key Vault with managed identity.
- Replace publish-profile deployment with OIDC once the Azure federated identity is correctly configured.
- Add a dedicated sessions container instead of sharing the users container.
- Add audit logs for auth, upload, edit, delete, and moderation actions.
