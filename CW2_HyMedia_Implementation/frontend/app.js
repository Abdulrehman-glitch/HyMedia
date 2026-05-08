const API_BASE_URL = "https://hymedia-api-b00968573-ajegdnfpa9braqet.italynorth-01.azurewebsites.net";

const healthOutput = document.getElementById("healthOutput");
const uploadOutput = document.getElementById("uploadOutput");
const uploadForm = document.getElementById("uploadForm");
const assetList = document.getElementById("assetList");
const refreshBtn = document.getElementById("refreshBtn");
const toast = document.getElementById("toast");

const totalAssets = document.getElementById("totalAssets");
const imageAssets = document.getElementById("imageAssets");
const sensitiveAssets = document.getElementById("sensitiveAssets");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

async function loadHealth() {
  try {
    const data = await fetchJson(`${API_BASE_URL}/api/v1/health`);
    healthOutput.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    healthOutput.textContent = `Health check failed: ${error.message}`;
  }
}

async function loadStats() {
  try {
    const response = await fetchJson(`${API_BASE_URL}/api/v1/assets/stats`);
    const stats = response.data;

    totalAssets.textContent = stats.totalAssets || 0;
    imageAssets.textContent = stats.imageAssets || 0;
    sensitiveAssets.textContent = stats.sensitiveAssets || 0;
  } catch (error) {
    showToast(`Stats failed: ${error.message}`);
  }
}

function renderPreview(asset) {
  const mediaUrl = `${API_BASE_URL}/api/v1/assets/${asset.assetId}/media`;

  if (asset.mediaType === "image" && asset.blobName) {
    return `<img src="${mediaUrl}" alt="${asset.title || "HyMedia asset"}" loading="lazy" />`;
  }

  if (asset.mediaType === "video" && asset.blobName) {
    return `
      <video controls>
        <source src="${mediaUrl}" type="${asset.mimeType || "video/mp4"}" />
        Your browser does not support video preview.
      </video>
    `;
  }

  if (asset.mediaType === "audio" && asset.blobName) {
    return `
      <div class="audio-preview">
        <span>Audio Asset</span>
        <audio controls>
          <source src="${mediaUrl}" type="${asset.mimeType || "audio/mpeg"}" />
          Your browser does not support audio preview.
        </audio>
      </div>
    `;
  }

  return `<span class="preview-placeholder">No preview available</span>`;
}

function renderAssets(assets) {
  if (!assets.length) {
    assetList.innerHTML = `<p>No assets found in Cosmos DB yet.</p>`;
    return;
  }

  assetList.innerHTML = assets
    .map((asset) => {
      const tags = Array.isArray(asset.tags) ? asset.tags : [];

      return `
        <article class="asset-card">
          <div class="asset-preview">
            ${renderPreview(asset)}
          </div>
          <div class="asset-body">
            <h3>${asset.title || "Untitled Asset"}</h3>
            <p class="asset-meta">${asset.mediaType || "unknown"} · ${asset.visibility || "PUBLIC"}</p>
            <p>${asset.caption || "No caption provided."}</p>

            <div class="tags">
              ${tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
            </div>

            <p class="asset-meta">
              Location: ${asset.location || "N/A"}<br />
              Status: ${asset.processingStatus || "READY"}<br />
              Asset ID: ${asset.assetId}
            </p>

            <div class="card-actions">
              <button class="secondary-btn" onclick="editAsset('${asset.assetId}')">Edit</button>
              <button class="danger-btn" onclick="deleteAsset('${asset.assetId}')">Delete</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadAssets() {
  try {
    const response = await fetchJson(`${API_BASE_URL}/api/v1/assets`);
    renderAssets(response.data || []);
  } catch (error) {
    assetList.innerHTML = `<p>Failed to load assets: ${error.message}</p>`;
  }
}

async function uploadAsset(event) {
  event.preventDefault();

  const fileInput = document.getElementById("mediaFile");

  if (!fileInput.files.length) {
    showToast("Please choose a media file.");
    return;
  }

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);
  formData.append("title", document.getElementById("title").value);
  formData.append("caption", document.getElementById("caption").value);
  formData.append("tags", document.getElementById("tags").value);
  formData.append("location", document.getElementById("location").value);
  formData.append("visibility", document.getElementById("visibility").value);
  formData.append("isSensitive", document.getElementById("isSensitive").checked);
  formData.append("isAdult18Plus", document.getElementById("isAdult18Plus").checked);

  uploadOutput.textContent = "Uploading to Azure Blob Storage...";

  try {
    const response = await fetchJson(`${API_BASE_URL}/api/v1/assets/upload`, {
      method: "POST",
      body: formData
    });

    uploadOutput.textContent = JSON.stringify(response, null, 2);
    uploadForm.reset();
    showToast("Upload successful.");
    await refreshDashboard();
  } catch (error) {
    uploadOutput.textContent = `Upload failed: ${error.message}`;
  }
}

async function editAsset(assetId) {
  const newTitle = prompt("Enter updated title:");

  if (!newTitle) {
    return;
  }

  const newCaption = prompt("Enter updated caption:") || "";

  try {
    await fetchJson(`${API_BASE_URL}/api/v1/assets/${assetId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: newTitle,
        caption: newCaption,
        tags: "updated,frontend,azure",
        visibility: "PUBLIC"
      })
    });

    showToast("Asset updated.");
    await refreshDashboard();
  } catch (error) {
    showToast(`Update failed: ${error.message}`);
  }
}

async function deleteAsset(assetId) {
  const confirmed = confirm("Are you sure you want to delete this asset metadata from Cosmos DB?");

  if (!confirmed) {
    return;
  }

  try {
    await fetchJson(`${API_BASE_URL}/api/v1/assets/${assetId}`, {
      method: "DELETE"
    });

    showToast("Asset deleted.");
    await refreshDashboard();
  } catch (error) {
    showToast(`Delete failed: ${error.message}`);
  }
}

async function refreshDashboard() {
  await loadHealth();
  await loadStats();
  await loadAssets();
}

uploadForm.addEventListener("submit", uploadAsset);
refreshBtn.addEventListener("click", refreshDashboard);

refreshDashboard();