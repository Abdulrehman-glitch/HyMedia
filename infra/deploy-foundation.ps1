param(
  [string]$ResourceGroupName = "hymedia_cw2",
  [string]$Location = "italynorth",
  [string]$ApiAppName = "hymedia-api-b00968573",
  [string]$KeyVaultName = "hymedia-kv-b00968573",
  [string]$ServiceBusNamespaceName = "hymedia-sb-b00968573",
  [string]$VnetName = "hymedia-vnet-b00968573"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$deploymentName = "hymedia-foundation-$(Get-Date -Format yyyyMMddHHmmss)"
$parametersFile = Join-Path $PSScriptRoot "hymedia-foundation.parameters.json"
$templateFile = Join-Path $PSScriptRoot "hymedia-foundation.bicep"
$trackingFile = Join-Path $repoRoot "Deployment-Details"

function Ensure-AzureRoleAssignment {
  param(
    [string]$PrincipalId,
    [string]$RoleName,
    [string]$Scope
  )

  $existing = az role assignment list `
    --assignee $PrincipalId `
    --role $RoleName `
    --scope $Scope `
    --query "[0].id" `
    --output tsv

  if (-not $existing) {
    az role assignment create `
      --assignee-object-id $PrincipalId `
      --assignee-principal-type ServicePrincipal `
      --role $RoleName `
      --scope $Scope `
      --output none
  }
}

Write-Host "Deploying HyMedia foundation: $deploymentName"
$deployment = az deployment group create `
  --resource-group $ResourceGroupName `
  --name $deploymentName `
  --template-file $templateFile `
  --parameters "@$parametersFile" `
  --parameters location=$Location `
  --output json | ConvertFrom-Json

$appIntegrationSubnetId = $deployment.properties.outputs.appIntegrationSubnetId.value
$queueName = $deployment.properties.outputs.mediaProcessingQueueName.value
$apiPrincipalId = az webapp identity show `
  --resource-group $ResourceGroupName `
  --name $ApiAppName `
  --query principalId `
  --output tsv

Write-Host "Connecting backend App Service to VNet integration subnet..."
az webapp vnet-integration add `
  --resource-group $ResourceGroupName `
  --name $ApiAppName `
  --vnet $VnetName `
  --subnet "app-integration" `
  --output none

Write-Host "Creating Service Bus connection string secret in Key Vault..."
$serviceBusConnectionString = az servicebus namespace authorization-rule keys list `
  --resource-group $ResourceGroupName `
  --namespace-name $ServiceBusNamespaceName `
  --name RootManageSharedAccessKey `
  --query primaryConnectionString `
  --output tsv

az keyvault secret set `
  --vault-name $KeyVaultName `
  --name "servicebus-connection-string" `
  --value $serviceBusConnectionString `
  --output none

$serviceBusSecretUri = az keyvault secret show `
  --vault-name $KeyVaultName `
  --name "servicebus-connection-string" `
  --query id `
  --output tsv

Write-Host "Assigning managed-identity data-plane roles..."
$storageId = az storage account show `
  --resource-group $ResourceGroupName `
  --name "hymediab00968573" `
  --query id `
  --output tsv
$serviceBusId = az servicebus namespace show `
  --resource-group $ResourceGroupName `
  --namespace-name $ServiceBusNamespaceName `
  --query id `
  --output tsv

Ensure-AzureRoleAssignment -PrincipalId $apiPrincipalId -RoleName "Storage Blob Data Contributor" -Scope $storageId
Ensure-AzureRoleAssignment -PrincipalId $apiPrincipalId -RoleName "Azure Service Bus Data Sender" -Scope $serviceBusId
Ensure-AzureRoleAssignment -PrincipalId $apiPrincipalId -RoleName "Azure Service Bus Data Receiver" -Scope $serviceBusId

$cosmosContributorRoleId = az cosmosdb sql role definition list `
  --resource-group $ResourceGroupName `
  --account-name "hymedia-cosmos-b00968573" `
  --query "[?roleName=='Cosmos DB Built-in Data Contributor'].id | [0]" `
  --output tsv
$existingCosmosRole = az cosmosdb sql role assignment list `
  --resource-group $ResourceGroupName `
  --account-name "hymedia-cosmos-b00968573" `
  --query "[?principalId=='$apiPrincipalId' && roleDefinitionId=='$cosmosContributorRoleId'].id | [0]" `
  --output tsv

if (-not $existingCosmosRole) {
  az cosmosdb sql role assignment create `
    --resource-group $ResourceGroupName `
    --account-name "hymedia-cosmos-b00968573" `
    --scope "/" `
    --principal-id $apiPrincipalId `
    --role-definition-id $cosmosContributorRoleId `
    --output none
}

Write-Host "Configuring backend app settings with Key Vault references..."
$tempSettings = Join-Path $env:TEMP "hymedia-appsettings-$(Get-Random).json"
@(
  @{ name = "SERVICEBUS_CONNECTION_STRING"; value = "@Microsoft.KeyVault(SecretUri=$serviceBusSecretUri)"; slotSetting = $false },
  @{ name = "SERVICEBUS_MEDIA_QUEUE_NAME"; value = $queueName; slotSetting = $false },
  @{ name = "AZURE_STORAGE_ORIGINAL_CONTAINER_NAME"; value = "media-original"; slotSetting = $false },
  @{ name = "AZURE_STORAGE_PROCESSED_CONTAINER_NAME"; value = "media-processed"; slotSetting = $false },
  @{ name = "AZURE_STORAGE_THUMBNAIL_CONTAINER_NAME"; value = "media-thumbnails"; slotSetting = $false },
  @{ name = "COSMOS_COMMENTS_CONTAINER_NAME"; value = "comments"; slotSetting = $false },
  @{ name = "COSMOS_AUDIT_CONTAINER_NAME"; value = "audit"; slotSetting = $false },
  @{ name = "COSMOS_PROCESSING_JOBS_CONTAINER_NAME"; value = "processing-jobs"; slotSetting = $false },
  @{ name = "COSMOS_SHARE_LINKS_CONTAINER_NAME"; value = "share-links"; slotSetting = $false }
) | ConvertTo-Json -Depth 3 | Set-Content -Path $tempSettings -Encoding UTF8

try {
  az webapp config appsettings set `
    --resource-group $ResourceGroupName `
    --name $ApiAppName `
    --settings "@$tempSettings" `
    --output none
} finally {
  Remove-Item -LiteralPath $tempSettings -Force -ErrorAction SilentlyContinue
}

$timestamp = Get-Date -Format o
$tracking = @"

## $timestamp - HyMedia Azure foundation deployment

Deployment name: $deploymentName
Resource group: $ResourceGroupName
Location: $Location
VNet: $VnetName
App integration subnet ID: $appIntegrationSubnetId
Service Bus namespace: $ServiceBusNamespaceName
Media processing queue: $queueName
Key Vault: $KeyVaultName
Backend managed identity principal ID: $apiPrincipalId
Tracked secret names only:
- servicebus-connection-string
- appinsights-connection-string
- azure-storage-connection-string
- cosmos-key
- jwt-secret
Storage containers:
- media-original
- media-processed
- media-thumbnails
Cosmos containers:
- comments
- audit
- processing-jobs
- share-links
- organisations
- notifications
- webhook-deliveries
- consent-records
Notes:
- Raw secret/token values were not written to this file.
- Backend app settings reference Key Vault for secret values.
- Backend managed identity has Storage Blob Data Contributor, Azure Service Bus Data Sender/Receiver, and Cosmos DB Built-in Data Contributor assignments.
- Private endpoints and DNS zones were created, but public network shutdown should be done only after private-path readiness tests pass.
"@

Add-Content -Path $trackingFile -Value $tracking
Write-Host "Deployment tracking appended to $trackingFile"
