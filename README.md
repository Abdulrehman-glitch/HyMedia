# HyMedia — Cloud-Native Multimedia Sharing Platform

**COM682 Cloud Native Development — Coursework 2 Implementation**  
**Student:** Abdulrehman Mohamedrafiq Vohra  
**Student ID:** B00968573  
**Module:** COM682 Cloud Native Development  
**Cloud Platform:** Microsoft Azure  

---

## Live Deployment

| Component | Azure Service | Live URL |
|---|---|---|
| Frontend Web App | Azure App Service | https://hymedia-web.azurewebsites.net |
| Backend API | Azure App Service | https://hymedia-api-b00968573-ajegdnfpa9braqet.italynorth-01.azurewebsites.net |
| Backend Health Check | Azure App Service API Endpoint | https://hymedia-api-b00968573-ajegdnfpa9braqet.italynorth-01.azurewebsites.net/api/v1/health |
| Assets API | Azure App Service API Endpoint | https://hymedia-api-b00968573-ajegdnfpa9braqet.italynorth-01.azurewebsites.net/api/v1/assets |

---

## Project Overview

HyMedia is a cloud-native multimedia sharing platform designed and implemented for the COM682 Cloud Native Development coursework. The application allows users to upload, manage, preview, update and delete multimedia assets through a deployed web interface.

The platform demonstrates a practical Azure-based implementation of a multimedia hosting system using:

- **Azure App Service** for hosting the frontend and backend
- **Azure Blob Storage** for storing binary media files
- **Azure Cosmos DB for NoSQL** for storing metadata and user records
- **Azure Application Insights** for monitoring and telemetry
- **GitHub Actions** for CI/CD deployment workflows
- **RESTful APIs** for CRUD operations
- **Cookie-based JWT sessions** for protected upload/edit/delete actions

The project is based on the original HyMedia CW1 design, which proposed a cloud-native multimedia platform supporting media uploads, metadata management, privacy controls, sensitive content handling and future creator-focused features.

---

## System Architecture

The implemented solution follows a separated frontend/backend cloud architecture.

```text
User Browser
   |
   | HTTPS
   v
Azure App Service — Frontend
   |
   | REST API calls
   v
Azure App Service — Backend API
   |
   | Stores binary files
   v
Azure Blob Storage
   |
   | Stores metadata and users
   v
Azure Cosmos DB for NoSQL
   |
   | Monitoring and telemetry
   v
Azure Application Insights
```

### Architecture Explanation

The frontend is deployed separately from the backend so that the user interface and API layer can be maintained and deployed independently. The backend API handles all application logic, including authentication, media upload, metadata storage, media streaming and CRUD operations.

Uploaded media files are not stored on the local server. Instead, files are uploaded into Azure Blob Storage, and only the related metadata is stored in Cosmos DB. This makes the system more cloud-native because the application server remains stateless and does not depend on local disk storage.

---

## Azure Resources Used

| Azure Resource | Purpose |
|---|---|
| Azure App Service — `hymedia-web` | Hosts the frontend web application |
| Azure App Service — `hymedia-api-b00968573` | Hosts the Node.js backend REST API |
| Azure Blob Storage | Stores uploaded multimedia files |
| Blob Container — `media` | Stores image/video/audio assets |
| Azure Cosmos DB for NoSQL | Stores asset metadata and user records |
| Cosmos Database — `hymedia-db` | Main project database |
| Cosmos Container — `assets` | Stores asset metadata |
| Cosmos Container — `users` | Stores registered user records |
| Azure Application Insights | Tracks requests, performance and errors |
| GitHub Actions | Provides CI/CD deployment workflows |

---

## Technology Stack

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript
- Node.js + Express static server
- Fetch API for backend communication
- Fetch API with `credentials: "include"` for HttpOnly cookie sessions

### Backend

- Node.js
- Express.js
- Azure Blob Storage SDK
- Azure Cosmos DB SDK
- Multer for file upload handling
- bcryptjs for password hashing
- jsonwebtoken for JWT authentication
- cookie-parser for HttpOnly access and refresh cookies
- express-rate-limit, Helmet and Zod for API hardening
- Application Insights SDK
- CORS middleware

### Cloud / DevOps

- Microsoft Azure App Service
- Microsoft Azure Blob Storage
- Microsoft Azure Cosmos DB for NoSQL
- Microsoft Azure Application Insights
- GitHub
- GitHub Actions

---

## Implemented Features

### 1. Live Frontend Dashboard

The deployed frontend provides a dashboard that connects directly to the deployed Azure backend API. It displays live system data from the backend, including:

- Total asset count
- Image asset count
- Sensitive asset count
- Backend health status
- Cosmos DB asset gallery

The frontend is available at:

```text
https://hymedia-web.azurewebsites.net
```

---

### 2. Backend Health Monitoring Endpoint

The backend includes a health endpoint to confirm that the API is running and connected to Azure services.

```http
GET /api/v1/health
```

Example response includes:

```json
{
  "status": "healthy",
  "service": "hymedia-backend-api",
  "environment": "production",
  "azureStorageConfigured": true,
  "cosmosConfigured": true,
  "usersContainerConfigured": true,
  "appInsightsConfigured": true
}
```

This endpoint is useful during testing, deployment verification and the final coursework demonstration.

---

### 3. User Signup and Login

HyMedia includes a cookie-based authentication system.

Users can:

- Create a new account
- Login with email and password
- Receive HttpOnly access and refresh cookies
- Upload, edit and delete assets only after login
- See an error message when credentials are incorrect

Authentication records are stored in Azure Cosmos DB inside the `users` container.

Passwords are not stored as plain text. They are hashed using `bcryptjs`.

### Authentication Endpoints

```http
POST /api/v1/auth/signup
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

### Signup Logic

1. User enters display name, email and password.
2. Backend validates the request.
3. Backend checks whether the email already exists.
4. Password is hashed using bcrypt.
5. User record is stored in Cosmos DB.
6. Backend sets short-lived access and rotating refresh cookies and returns a safe user object.

### Login Logic

1. User enters email and password.
2. Backend searches for the user in Cosmos DB.
3. Password is compared with the stored hash.
4. If valid, short-lived access and rotating refresh cookies are set.
5. If invalid, an error message is returned.

---

### 4. Media Upload to Azure Blob Storage

Users can upload multimedia files through the frontend after logging in.

The upload process works as follows:

1. User selects a media file and enters metadata.
2. Frontend sends the file and metadata to the backend API.
3. Backend temporarily receives the file using Multer.
4. Backend uploads the binary file to Azure Blob Storage.
5. Backend creates a metadata record in Azure Cosmos DB.
6. Frontend refreshes the gallery and displays the new asset.

### Upload Endpoint

```http
POST /api/v1/assets/upload
```

This endpoint is protected by the authenticated session cookie. Bearer tokens are still accepted by the API middleware for compatibility.

### Supported Media Types

The system supports common media formats including:

- Images: JPG, JPEG, PNG, GIF, WEBP
- Video: MP4, MOV, WEBM
- Audio: MP3, WAV, OGG

---

### 5. Asset Gallery

The asset gallery displays media records stored in Cosmos DB. Each asset card includes:

- Preview
- Title
- Caption
- Tags
- Location
- Visibility
- Owner
- Processing status
- Sensitive / 18+ badges where applicable
- Edit and delete buttons

The gallery is loaded from the backend using:

```http
GET /api/v1/assets
```

---

### 6. Secure Media Preview and Streaming

Because the Blob container is private, the frontend does not directly expose Blob Storage access. Instead, media is streamed through the backend using a media endpoint.

```http
GET /api/v1/assets/:assetId/media
```

This allows the backend to control how media is served and keeps the storage container private.

For video files, the backend supports HTTP range requests so that browser video playback works correctly.

---

### 7. Single Asset Detail View

Users can click an asset card to open a larger detail modal. This provides a better view of the selected asset and displays detailed metadata such as:

- Asset ID
- Media type
- MIME type
- Location
- Visibility
- Sensitive flag
- 18+ flag
- Owner email
- Tags
- Caption

This makes the application more usable and supports a stronger coursework demonstration.

---

### 8. Edit Asset Metadata

Logged-in users can update asset metadata through a modal form.

Editable fields include:

- Title
- Caption
- Tags
- Location
- Visibility
- Sensitive flag
- 18+ flag

### Update Endpoint

```http
PUT /api/v1/assets/:assetId
```

This endpoint updates the metadata record stored in Cosmos DB.

---

### 9. Delete Asset Metadata

Logged-in users can delete asset metadata from Cosmos DB.

### Delete Endpoint

```http
DELETE /api/v1/assets/:assetId
```

The current implementation moves deleted assets to a recycle bin first. Permanent purge removes the Cosmos DB metadata and attempts to delete the linked Blob Storage file.

---

### 10. Sensitive and 18+ Content Blur

HyMedia supports simple sensitive content and 18+ content handling.

When an asset is marked as sensitive or 18+:

- The media preview is blurred by default.
- A warning overlay is displayed.
- The user must click **View Content** to reveal it.
- The asset also displays warning badges in the gallery.

This feature reflects the CW1 design idea of privacy controls and sensitive content handling.

---

### 11. Application Insights Monitoring

Azure Application Insights is configured for the backend. It is used for:

- Tracking API requests
- Monitoring response times
- Detecting server errors
- Supporting debugging after deployment
- Demonstrating an advanced Azure monitoring feature

This supports the cloud-native monitoring requirement of the coursework.

---

### 12. GitHub CI/CD

The project uses GitHub Actions workflows for continuous deployment.

The repository contains separate workflows for:

- Backend deployment to Azure App Service
- Frontend deployment to Azure App Service

This means future changes can be committed and pushed to GitHub, and Azure can redeploy the application automatically.

---

## REST API Summary

### Health

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/health` | Checks backend and Azure service configuration |

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/signup` | Creates a new user account |
| POST | `/api/v1/auth/login` | Verifies user credentials and sets auth cookies |
| POST | `/api/v1/auth/refresh` | Rotates the refresh session and renews the access cookie |
| POST | `/api/v1/auth/logout` | Revokes the refresh session and clears auth cookies |
| GET | `/api/v1/auth/me` | Returns the authenticated user from the session |
| GET | `/api/v1/auth/sessions` | Lists active account sessions |
| DELETE | `/api/v1/auth/sessions/:sessionId` | Revokes one account session |
| GET | `/api/v1/auth/export` | Exports account data |
| DELETE | `/api/v1/auth/account` | Deletes/anonymises the account |

### Assets

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/api/v1/assets` | Retrieves all asset metadata | No |
| GET | `/api/v1/assets/stats` | Retrieves dashboard asset statistics | No |
| GET | `/api/v1/assets/recycle-bin` | Retrieves the signed-in user's deleted assets | Yes |
| GET | `/api/v1/assets/share/:token/media` | Streams media through a valid share token | No |
| GET | `/api/v1/assets/:assetId` | Retrieves a single asset metadata record | No |
| GET | `/api/v1/assets/:assetId/media` | Streams the media file from Azure Blob Storage | No |
| POST | `/api/v1/assets` | Creates a metadata-only asset | Yes |
| POST | `/api/v1/assets/upload` | Uploads a media file and creates metadata | Yes |
| GET | `/api/v1/assets/:assetId/share-links` | Lists share links for an owned asset | Yes |
| POST | `/api/v1/assets/:assetId/share-links` | Creates an expiring share link | Yes |
| DELETE | `/api/v1/assets/share-links/:shareId` | Revokes a share link | Yes |
| POST | `/api/v1/assets/:assetId/report` | Reports an asset for review | Yes |
| POST | `/api/v1/assets/:assetId/restore` | Restores a soft-deleted asset | Yes |
| DELETE | `/api/v1/assets/:assetId/purge` | Permanently deletes metadata and linked blob | Yes |
| PUT | `/api/v1/assets/:assetId` | Updates asset metadata | Yes |
| DELETE | `/api/v1/assets/:assetId` | Soft-deletes asset metadata into the recycle bin | Yes |

### Moderation and Admin

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/api/v1/moderation/queue` | Retrieves the moderation queue | `moderation:review` permission |
| POST | `/api/v1/moderation/:assetId/decision` | Applies a moderation decision | `moderation:review` permission |
| GET | `/api/v1/admin/users` | Lists users for role management | `user:manage-roles` permission |
| PUT | `/api/v1/admin/users/:userId/role` | Updates a user's role | `user:manage-roles` permission |

---

## Project Folder Structure

```text
Cloud_Native_Development
│
└── Hymedia_codebase
    │
    ├── backend
    │   ├── src
    │   │   ├── config
    │   │   │   ├── applicationInsights.js
    │   │   │   ├── blobClient.js
    │   │   │   └── cosmosClient.js
    │   │   │
    │   │   ├── controllers
    │   │   │   ├── assets.controller.js
    │   │   │   └── auth.controller.js
    │   │   │
    │   │   ├── middleware
    │   │   │   ├── auth.middleware.js
    │   │   │   └── upload.middleware.js
    │   │   │
    │   │   ├── routes
    │   │   │   ├── assets.routes.js
    │   │   │   └── auth.routes.js
    │   │   │
    │   │   └── services
    │   │       ├── blob.service.js
    │   │       ├── cosmos-assets.service.js
    │   │       └── users.service.js
    │   │
    │   ├── server.js
    │   ├── package.json
    │   └── .env
    │
    ├── frontend
    │   ├── index.html
    │   ├── styles.css
    │   ├── app.js
    │   ├── config.js
    │   ├── server.js
    │   └── package.json
    │
    ├── docs
    └── screenshots
```

---

## Environment Variables

The backend uses environment variables for Azure configuration. These are configured in the Azure App Service settings and should not be committed to GitHub.

Required backend environment variables:

```env
NODE_ENV=production
AZURE_STORAGE_CONNECTION_STRING=...
AZURE_STORAGE_CONTAINER_NAME=media
COSMOS_ENDPOINT=...
COSMOS_KEY=...
COSMOS_DATABASE_NAME=hymedia-db
COSMOS_CONTAINER_NAME=assets
COSMOS_USERS_CONTAINER_NAME=users
COSMOS_AUDIT_CONTAINER_NAME=audit
APPINSIGHTS_CONNECTION_STRING=...
JWT_SECRET=...
```

The frontend uses:

```js
window.HYMEDIA_CONFIG = {
  API_BASE_URL: "https://hymedia-api-b00968573-ajegdnfpa9braqet.italynorth-01.azurewebsites.net"
};
```

---

## Running Locally

### Backend

```bash
cd Hymedia_codebase/backend
npm install
npm run dev
```

Backend local URL:

```text
http://localhost:5000
```

### Frontend

```bash
cd Hymedia_codebase/frontend
npm install
npm start
```

Frontend local URL:

```text
http://localhost:3000
```

---

## Testing Checklist

Before deployment or final demonstration, the following tests should pass:

- Frontend loads successfully.
- Backend health endpoint returns healthy status.
- Signup creates a new user in Cosmos DB.
- Login succeeds with correct credentials.
- Login fails with incorrect credentials.
- Upload stores media in Azure Blob Storage.
- Upload stores metadata in Cosmos DB.
- Asset gallery loads from Cosmos DB.
- Image preview works.
- Video preview works using streaming.
- Sensitive/18+ content is blurred.
- View Content button reveals blurred media.
- Asset detail modal opens correctly.
- Edit metadata updates Cosmos DB.
- Delete removes asset metadata.
- Application Insights receives request telemetry.
- GitHub Actions workflows complete successfully.

---

## Security Considerations

The implementation includes several security-focused decisions:

- Blob Storage container is kept private.
- Media preview is served through the backend instead of exposing local server storage.
- Passwords are hashed before being stored.
- HttpOnly cookie-based JWT sessions are used for protected actions.
- Upload, edit and delete actions require login.
- CORS is configured to allow the deployed frontend and local development origins.
- Secrets and connection strings are stored in Azure App Service environment variables rather than hardcoded in the repository.

---

## Current Limitations

This coursework implementation focuses on the core cloud-native functionality required for the project. Some features are implemented as an MVP and can be extended further.

Current limitations include:

- Passkeys are not implemented yet.
- There is no full password reset flow.
- There is no email verification.
- There is no advanced moderation API integration yet.
- Sensitive and 18+ handling has local moderation/status controls but is not yet connected to an external moderation service.
- Likes and comments are not fully implemented yet.
- Creator monetisation is planned but not implemented.
- Search is basic and can be improved with Azure AI Search.
- Media processing is still request-path based; thumbnails, transcodes and queue workers are planned.

---

## Future Improvements

The current version of HyMedia is a working cloud-native MVP. The following improvements are planned for future versions.

### 1. Full User Profiles

Future updates will add complete user profile pages. Users will be able to:

- Update profile picture
- Edit display name
- Add bio
- View uploaded assets
- View public creator profile
- Manage privacy settings

This would make HyMedia feel more like a real multimedia social platform.

### 2. Role-Based Access Control

The current authentication system includes `user`, `creator`, `moderator`, `organisation_admin`, `platform_admin`, and legacy `admin` roles. API access is enforced through effective permissions rather than only checking role strings.

- `asset:create`
- `asset:manage-own`
- `asset:manage-any`
- `asset:share`
- `moderation:review`
- `user:manage-roles`

Platform admins can manage user roles and moderators can review flagged content. Future creator and organisation features can extend the same permission matrix.

### 3. Blob Reconciliation and Retention Policies

Asset deletion now uses a recycle-bin flow, and permanent purge attempts to remove both metadata and the corresponding file from Azure Blob Storage. A future update can add scheduled reconciliation and retention policies.

Planned logic:

```text
DELETE /api/v1/assets/:assetId
1. Mark asset as deleted and hide it from normal feeds
2. Allow owner/admin restore from recycle bin
3. Permanently purge when requested or after retention expiry
4. Delete linked blob from Azure Blob Storage
5. Delete or anonymise remaining metadata as required
```

Scheduled reconciliation would verify that no orphaned files remain in Blob Storage.

### 4. Advanced Search and Filtering

Search will be improved to support:

- Search by title
- Search by caption
- Filter by media type
- Filter by tags
- Filter by location
- Filter by creator
- Filter by date range

A future version may use Azure AI Search for faster and smarter search across large metadata collections.

### 5. Likes and Comments

The platform will include engagement features such as:

- Like/unlike assets
- Comment on assets
- Delete own comments
- Display engagement counts
- Sort content by popularity

This will make the application closer to a real multimedia sharing platform.

### 6. Azure Function Processing Worker

A future version will include an Azure Function triggered after upload. The worker could process media asynchronously.

Planned tasks:

- Validate file metadata
- Generate thumbnails
- Generate video preview versions
- Extract audio waveform information
- Update `processingStatus` in Cosmos DB
- Add AI-generated tags

This follows the Web–Queue–Worker style from the original design.

### 7. Queue-Based Media Processing

The backend can add a message to Azure Storage Queue or Service Bus after uploading a file. A worker can then process the file in the background.

Planned flow:

```text
Upload media → Save blob → Save pending metadata → Send queue message → Azure Function processes file → Update Cosmos DB
```

This would improve scalability because slow media processing would not block the user-facing upload request.

### 8. AI Content Moderation

Future versions will integrate Azure AI Content Safety or Azure Computer Vision to automatically detect inappropriate or sensitive media.

Planned features:

- Auto-flag sensitive images
- Detect adult or violent content
- Store moderation labels in Cosmos DB
- Blur content automatically based on moderation score
- Allow admin/moderator review

### 9. AI Auto-Tagging

Azure Computer Vision can be used to generate tags from uploaded images. This would help users find content more easily.

Example:

```text
Uploaded image → Azure Vision detects "city", "food", "person", "street" → tags saved in Cosmos DB
```

### 10. Video Thumbnail Generation

Future updates will generate thumbnails for videos so that the asset gallery can display a lightweight preview image before playback.

This would reduce loading time and make the gallery more visually consistent.

### 11. Audio Preview Improvements

Audio assets can be improved with:

- Waveform generation
- Audio duration display
- Album-style thumbnail
- Transcript support using Azure Speech Service

### 12. Creator Subscriptions

The original HyMedia design included creator subscriptions and monetisation. Future updates will add:

- Creator accounts
- Premium-only posts
- Subscriber access checks
- Subscription status
- Payment records
- Payout ledger

### 13. Private and Selected User Sharing

The current visibility field supports values such as `PUBLIC`, `PRIVATE_SELECTED`, `UNLISTED_LINK` and `CREATOR_PREMIUM`. Future work will fully enforce these privacy modes through backend access checks.

Planned behaviour:

- Public assets visible to everyone
- Private assets visible only to selected users
- Unlisted assets accessible only through signed share links
- Premium assets visible only to subscribers

### 14. Passkeys and Session Policy Controls

The current implementation already uses short-lived access cookies and rotating refresh cookies. A future production version can add:

- Passkey/WebAuthn sign-in
- Password reset and email verification
- Session risk scoring
- Device trust prompts
- Organization-level session lifetime policies

This would improve phishing resistance and administrative control.

### 15. Custom Domain and HTTPS Configuration

Future deployment improvements may include:

```text
https://www.hymedia.example.com
https://api.hymedia.example.com
```

A custom domain would make the deployment look more professional and commercial-ready.

### 16. Improved CI/CD Pipeline

The current GitHub Actions deployment already runs dependency installation, syntax checks, tests, high-severity audit checks, artifact packaging, Azure deployment and live health smoke checks. It can still be extended to include:

- Separate staging and production deployments
- Manual approval before production release
- Deployment badges in README

### 17. Application Insights Dashboards

Application Insights can be extended with custom dashboards showing:

- Upload count
- Failed requests
- API response time
- Most used endpoints
- User activity
- Error traces

This would improve operational monitoring and support real-world cloud management.

### 18. Cost Monitoring and Budget Alerts

Future Azure improvements will include:

- Azure budget alerts
- Cost analysis dashboard
- Resource tagging
- Storage lifecycle rules
- Automatic cleanup of unused test assets

This would support better cloud administration and cost control.

---

## Deployment URLs

### Frontend

```text
https://hymedia-web.azurewebsites.net
```

### Backend

```text
https://hymedia-api-b00968573-ajegdnfpa9braqet.italynorth-01.azurewebsites.net
```

### Important API URLs

```text
GET  /api/v1/health
GET  /api/v1/assets
GET  /api/v1/assets/stats
POST /api/v1/auth/signup
POST /api/v1/auth/login
POST /api/v1/assets/upload
PUT  /api/v1/assets/:assetId
DELETE /api/v1/assets/:assetId
GET  /api/v1/assets/:assetId/media
```

---

## Final Coursework Demonstration Summary

The final video demonstration should show:

1. Live frontend on Azure App Service.
2. Backend health endpoint.
3. Signup and login.
4. Failed login error handling.
5. Upload media asset.
6. Confirm media appears in Azure Blob Storage.
7. Confirm metadata appears in Cosmos DB.
8. Asset gallery loading from Cosmos DB.
9. Media preview and detail view.
10. Sensitive/18+ blur and reveal behaviour.
11. Edit asset metadata.
12. Delete test asset.
13. Azure resources inside the resource group.
14. Application Insights monitoring.
15. GitHub Actions CI/CD workflow.

---

## Conclusion

HyMedia successfully demonstrates a deployed cloud-native multimedia platform using Microsoft Azure services. The implementation includes a separated frontend and backend, RESTful API endpoints, secure media upload to Azure Blob Storage, metadata storage in Azure Cosmos DB, user authentication, sensitive content handling, Application Insights monitoring and GitHub-based deployment workflows.

This project shows how a multimedia web application can be designed and implemented using modern cloud-native principles such as stateless application hosting, managed storage services, NoSQL metadata storage, REST APIs, CI/CD and cloud monitoring.
