# HyMedia Azure Foundation

This folder defines the next HyMedia Azure foundation layer.

It provisions:

- VNet with App Service integration and private endpoint subnets.
- Private endpoints and private DNS zones for Blob Storage, Cosmos DB SQL API, and Key Vault.
- Separate private Blob containers: `media-original`, `media-processed`, `media-thumbnails`.
- Service Bus namespace and `media-processing` queue.
- Event Grid system topic and BlobCreated subscription from `media-original` to Service Bus.
- Cosmos containers for comments, audit, processing jobs, share links, organisations, notifications, webhook deliveries, and consent records.
- Backend app settings for the new queue/container names.
- Key Vault secret reference for the Service Bus connection string.

Run from the repo root:

```powershell
./infra/deploy-foundation.ps1
```

The script appends deployment tracking to `Deployment-Details`, which is intentionally git-ignored. It records resource names, secret names, and output IDs, but never raw secret values.

Do not disable public network access on Storage, Cosmos DB, or Key Vault until private endpoint DNS and App Service VNet integration have been verified from the backend runtime.
