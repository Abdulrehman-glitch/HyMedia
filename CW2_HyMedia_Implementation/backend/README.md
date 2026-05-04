# HyMedia Backend API

Backend API for the COM682 CW2 HyMedia cloud-native multimedia sharing platform.

## Current stage

Step 5B: Local Asset CRUD API using temporary in-memory data.

## Local URL

http://localhost:5000

## Endpoints

GET     /api/v1/health
GET     /api/v1/assets
GET     /api/v1/assets/stats
GET     /api/v1/assets/:assetId
POST    /api/v1/assets
PUT     /api/v1/assets/:assetId
DELETE  /api/v1/assets/:assetId

## Run locally

npm run dev

## Notes

The current asset service uses temporary in-memory data. In the next implementation stages, the service layer will be replaced with Azure Blob Storage for binary media files and Azure Cosmos DB for metadata.
