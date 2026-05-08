const API_BASE_URL =
  window.HYMEDIA_CONFIG?.API_BASE_URL ||
  "https://hymedia-api-b00968573-ajegdnfpa9braqet.italynorth-01.azurewebsites.net";

const healthOutput = document.getElementById("healthOutput");
const uploadOutput = document.getElementById("uploadOutput");
const uploadForm = document.getElementById("uploadForm");
const assetList = document.getElementById("assetList");
const refreshBtn = document.getElementById("refreshBtn");
const toast = document.getElementById("toast");

const totalAssets = document.getElementById("totalAssets");
const imageAssets = document.getElementById("imageAssets");
const sensitiveAssets = document.getElementById("sensitiveAssets");

const openAuthBtn = document.getElementById("openAuthBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authStatus = document.getElementById("authStatus");
const authModal = document.getElementById("authModal");
const closeAuthModal = document.getElementById("closeAuthModal");
const authModalTitle = document.getElementById("authModalTitle");
const loginTabBtn = document.getElementById("loginTabBtn");
const signupTabBtn = document.getElementById("signupTabBtn");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const authOutput = document.getElementById("authOutput");

const editModal = document.getElementById("editModal");
const editForm = document.getElementById("editForm");
const closeEditModal = document.getElementById("closeEditModal");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const assetViewModal = document.getElementById("assetViewModal");
const assetViewContent = document.getElementById("assetViewContent");
const viewAssetTitle = document.getElementById("viewAssetTitle");
const closeAssetViewModal = document.getElementById("closeAssetViewModal");

let currentAssets = [];
let currentUser = JSON.parse(localStorage.getItem("hymedia_user") || "null");
let authToken = localStorage.getItem("hymedia_token") || "";
let revealedAssets = new Set();

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function updateAuthStatus() {
  if (currentUser && authToken) {
    authStatus.textContent = `Logged in as ${currentUser.displayName || currentUser.email}`;
    authStatus.classList.add("logged-in");
    openAuthBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
  } else {
    authStatus.textContent = "Not logged in";
    authStatus.classList.remove("logged-in");
    openAuthBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
  }
}

function openAuthModal(mode = "login") {
  authModal.classList.add("open");
  setAuthMode(mode);
}

function closeAuth() {
  authModal.classList.remove("open");
}

function setAuthMode(mode) {
  const isLogin = mode === "login";

  authModalTitle.textContent = isLogin ? "Login" : "Create Account";

  loginTabBtn.classList.toggle("active", isLogin);
  signupTabBtn.classList.toggle("active", !isLogin);

  loginForm.classList.toggle("hidden", !isLogin);
  signupForm.classList.toggle("hidden", isLogin);

  authOutput.textContent = isLogin
    ? "Enter your HyMedia account details."
    : "Create a new HyMedia account. This will be stored in Azure Cosmos DB.";
}

function getAuthHeader() {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type") || "";

  let data;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = {
      success: false,
      message: text || `Request failed with status ${response.status}`
    };
  }

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

async function signup(event) {
  event.preventDefault();

  const payload = {
    displayName: document.getElementById("signupDisplayName").value.trim(),
    email: document.getElementById("signupEmail").value.trim(),
    password: document.getElementById("signupPassword").value
  };

  authOutput.textContent = "Creating account...";

  try {
    const response = await fetchJson(`${API_BASE_URL}/api/v1/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    authToken = response.token;
    currentUser = response.user;

    localStorage.setItem("hymedia_token", authToken);
    localStorage.setItem("hymedia_user", JSON.stringify(currentUser));

    signupForm.reset();
    updateAuthStatus();
    authOutput.textContent = JSON.stringify(response, null, 2);
    showToast("Account created and logged in.");
    closeAuth();
  } catch (error) {
    authOutput.textContent = error.message;
    showToast(error.message);
  }
}

async function login(event) {
  event.preventDefault();

  const payload = {
    email: document.getElementById("loginEmail").value.trim(),
    password: document.getElementById("loginPassword").value
  };

  authOutput.textContent = "Checking credentials...";

  try {
    const response = await fetchJson(`${API_BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    authToken = response.token;
    currentUser = response.user;

    localStorage.setItem("hymedia_token", authToken);
    localStorage.setItem("hymedia_user", JSON.stringify(currentUser));

    loginForm.reset();
    updateAuthStatus();
    authOutput.textContent = JSON.stringify(response, null, 2);
    showToast("Login successful.");
    closeAuth();
  } catch (error) {
    authOutput.textContent = error.message;
    showToast(error.message);
  }
}

function logout() {
  authToken = "";
  currentUser = null;

  localStorage.removeItem("hymedia_token");
  localStorage.removeItem("hymedia_user");

  updateAuthStatus();
  showToast("Logged out.");
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

function formatTags(tags) {
  if (Array.isArray(tags)) return tags;

  if (typeof tags === "string") {
    return tags.split(",").map((tag) => tag.trim()).filter(Boolean);
  }

  return [];
}

function isRestricted(asset) {
  return Boolean(asset.isSensitive || asset.isAdult18Plus);
}

function mediaUrl(asset) {
  return `${API_BASE_URL}/api/v1/assets/${asset.assetId}/media`;
}

function renderMedia(asset, mode = "card") {
  const url = mediaUrl(asset);
  const restricted = isRestricted(asset);
  const revealed = revealedAssets.has(asset.assetId);
  const blurClass = restricted && !revealed ? "blurred-media" : "";

  let element = `<span class="preview-placeholder">No preview available</span>`;

  if (asset.mediaType === "image" && asset.blobName) {
    element = `<img class="${blurClass}" src="${url}" alt="${asset.title || "HyMedia asset"}" loading="lazy" />`;
  }

  if (asset.mediaType === "video" && asset.blobName) {
    element = `
      <video class="${blurClass}" controls preload="metadata" playsinline>
        <source src="${url}" type="${asset.mimeType || "video/mp4"}" />
        Your browser does not support video preview.
      </video>
    `;
  }

  if (asset.mediaType === "audio" && asset.blobName) {
    element = `
      <div class="audio-preview ${blurClass}">
        <span>Audio Asset</span>
        <audio controls preload="metadata">
          <source src="${url}" type="${asset.mimeType || "audio/mpeg"}" />
        </audio>
      </div>
    `;
  }

  const overlay =
    restricted && !revealed
      ? `
        <div class="restricted-overlay">
          <strong>${asset.isAdult18Plus ? "18+ Content" : "Sensitive Content"}</strong>
          <span>This media is blurred based on its content flag.</span>
          <button type="button" onclick="revealAsset(event, '${asset.assetId}')">View Content</button>
        </div>
      `
      : "";

  return `
    <div class="${mode === "detail" ? "detail-media-frame" : "asset-preview"}">
      ${element}
      ${overlay}
      <span class="asset-pill">${asset.mediaType || "media"}</span>
    </div>
  `;
}

function revealAsset(event, assetId) {
  event.stopPropagation();
  revealedAssets.add(assetId);
  renderAssets(currentAssets);
}

function renderAssets(assets) {
  currentAssets = assets;

  if (!assets.length) {
    assetList.innerHTML = `<p>No assets found in Cosmos DB yet.</p>`;
    return;
  }

  assetList.innerHTML = assets
    .map((asset) => {
      const tags = formatTags(asset.tags);

      return `
        <article class="asset-card" onclick="openAssetView('${asset.assetId}')">
          ${renderMedia(asset, "card")}

          <div class="asset-body">
            <div class="asset-title-row">
              <h3>${asset.title || "Untitled Asset"}</h3>
              <span class="visibility-pill">${asset.visibility || "PUBLIC"}</span>
            </div>

            <div class="warning-row">
              ${asset.isSensitive ? `<span class="warning-pill">Sensitive</span>` : ""}
              ${asset.isAdult18Plus ? `<span class="warning-pill danger">18+</span>` : ""}
            </div>

            <p>${asset.caption || "No caption provided."}</p>

            <div class="tags">
              ${tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
            </div>

            <div class="meta-grid">
              <span>Location</span>
              <strong>${asset.location || "N/A"}</strong>

              <span>Status</span>
              <strong>${asset.processingStatus || "READY"}</strong>

              <span>Owner</span>
              <strong>${asset.ownerEmail || "Legacy asset"}</strong>
            </div>

            <div class="card-actions">
              <button class="secondary-btn" onclick="event.stopPropagation(); openEditModal('${asset.assetId}')">Edit</button>
              <button class="danger-btn" onclick="event.stopPropagation(); deleteAsset('${asset.assetId}')">Delete</button>
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

  if (!authToken) {
    showToast("Please login before uploading.");
    openAuthModal("login");
    return;
  }

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
      headers: getAuthHeader(),
      body: formData
    });

    uploadOutput.textContent = JSON.stringify(response, null, 2);
    uploadForm.reset();
    showToast("Upload successful.");
    await refreshDashboard();
  } catch (error) {
    uploadOutput.textContent = `Upload failed: ${error.message}`;
    showToast(error.message);
  }
}

function openAssetView(assetId) {
  const asset = currentAssets.find((item) => item.assetId === assetId);
  if (!asset) return;

  const tags = formatTags(asset.tags);

  viewAssetTitle.textContent = asset.title || "HyMedia Asset";

  assetViewContent.innerHTML = `
    <div class="asset-detail-layout">
      ${renderMedia(asset, "detail")}

      <div class="asset-detail-info">
        <h3>${asset.title || "Untitled Asset"}</h3>
        <p>${asset.caption || "No caption provided."}</p>

        <div class="tags">
          ${tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
        </div>

        <div class="meta-grid large">
          <span>Asset ID</span>
          <strong>${asset.assetId}</strong>

          <span>Media Type</span>
          <strong>${asset.mediaType || "N/A"}</strong>

          <span>MIME Type</span>
          <strong>${asset.mimeType || "N/A"}</strong>

          <span>Location</span>
          <strong>${asset.location || "N/A"}</strong>

          <span>Visibility</span>
          <strong>${asset.visibility || "PUBLIC"}</strong>

          <span>Sensitive</span>
          <strong>${asset.isSensitive ? "Yes" : "No"}</strong>

          <span>18+</span>
          <strong>${asset.isAdult18Plus ? "Yes" : "No"}</strong>

          <span>Owner</span>
          <strong>${asset.ownerEmail || "Legacy asset"}</strong>
        </div>

        <div class="modal-actions">
          <button class="secondary-btn" onclick="openEditModal('${asset.assetId}')">Edit Metadata</button>
          <button class="danger-btn" onclick="deleteAsset('${asset.assetId}')">Delete Asset</button>
        </div>
      </div>
    </div>
  `;

  assetViewModal.classList.add("open");
}

function closeAssetView() {
  assetViewModal.classList.remove("open");
}

function openEditModal(assetId) {
  if (!authToken) {
    showToast("Please login before editing.");
    openAuthModal("login");
    return;
  }

  const asset = currentAssets.find((item) => item.assetId === assetId);
  if (!asset) return;

  document.getElementById("editAssetId").value = asset.assetId;
  document.getElementById("editTitle").value = asset.title || "";
  document.getElementById("editCaption").value = asset.caption || "";
  document.getElementById("editTags").value = formatTags(asset.tags).join(", ");
  document.getElementById("editLocation").value = asset.location || "";
  document.getElementById("editVisibility").value = asset.visibility || "PUBLIC";
  document.getElementById("editIsSensitive").checked = Boolean(asset.isSensitive);
  document.getElementById("editIsAdult18Plus").checked = Boolean(asset.isAdult18Plus);

  editModal.classList.add("open");
}

function closeEdit() {
  editModal.classList.remove("open");
  editForm.reset();
}

async function submitEdit(event) {
  event.preventDefault();

  const assetId = document.getElementById("editAssetId").value;

  const payload = {
    title: document.getElementById("editTitle").value,
    caption: document.getElementById("editCaption").value,
    tags: document.getElementById("editTags").value,
    location: document.getElementById("editLocation").value,
    visibility: document.getElementById("editVisibility").value,
    isSensitive: document.getElementById("editIsSensitive").checked,
    isAdult18Plus: document.getElementById("editIsAdult18Plus").checked
  };

  try {
    await fetchJson(`${API_BASE_URL}/api/v1/assets/${assetId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader()
      },
      body: JSON.stringify(payload)
    });

    closeEdit();
    closeAssetView();
    showToast("Asset metadata updated.");
    await refreshDashboard();
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteAsset(assetId) {
  if (!authToken) {
    showToast("Please login before deleting.");
    openAuthModal("login");
    return;
  }

  const confirmed = confirm("Are you sure you want to delete this asset metadata from Cosmos DB?");
  if (!confirmed) return;

  try {
    await fetchJson(`${API_BASE_URL}/api/v1/assets/${assetId}`, {
      method: "DELETE",
      headers: getAuthHeader()
    });

    closeAssetView();
    showToast("Asset deleted.");
    await refreshDashboard();
  } catch (error) {
    showToast(error.message);
  }
}

async function refreshDashboard() {
  await loadHealth();
  await loadStats();
  await loadAssets();
}

openAuthBtn.addEventListener("click", () => openAuthModal("login"));
closeAuthModal.addEventListener("click", closeAuth);
loginTabBtn.addEventListener("click", () => setAuthMode("login"));
signupTabBtn.addEventListener("click", () => setAuthMode("signup"));
signupForm.addEventListener("submit", signup);
loginForm.addEventListener("submit", login);
logoutBtn.addEventListener("click", logout);

uploadForm.addEventListener("submit", uploadAsset);
refreshBtn.addEventListener("click", refreshDashboard);

editForm.addEventListener("submit", submitEdit);
closeEditModal.addEventListener("click", closeEdit);
cancelEditBtn.addEventListener("click", closeEdit);

closeAssetViewModal.addEventListener("click", closeAssetView);

authModal.addEventListener("click", (event) => {
  if (event.target === authModal) closeAuth();
});

editModal.addEventListener("click", (event) => {
  if (event.target === editModal) closeEdit();
});

assetViewModal.addEventListener("click", (event) => {
  if (event.target === assetViewModal) closeAssetView();
});

updateAuthStatus();
refreshDashboard();