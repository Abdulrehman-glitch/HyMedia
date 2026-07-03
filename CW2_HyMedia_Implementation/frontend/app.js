const API_BASE_URL =
  window.HYMEDIA_CONFIG?.API_BASE_URL ||
  "https://hymedia-api-b00968573-ajegdnfpa9braqet.italynorth-01.azurewebsites.net";

const state = {
  assets: [],
  revealedAssets: new Set(),
  currentUser: JSON.parse(localStorage.getItem("hymedia_user") || "null"),
  authToken: localStorage.getItem("hymedia_token") || "",
  search: "",
  typeFilter: ""
};

const qs = (selector) => document.querySelector(selector);

const elements = {
  healthOutput: qs("#healthOutput"),
  uploadOutput: qs("#uploadOutput"),
  uploadForm: qs("#uploadForm"),
  assetList: qs("#assetList"),
  refreshBtn: qs("#refreshBtn"),
  toast: qs("#toast"),
  totalAssets: qs("#totalAssets"),
  imageAssets: qs("#imageAssets"),
  sensitiveAssets: qs("#sensitiveAssets"),
  openAuthBtn: qs("#openAuthBtn"),
  logoutBtn: qs("#logoutBtn"),
  authStatus: qs("#authStatus"),
  authModal: qs("#authModal"),
  closeAuthModal: qs("#closeAuthModal"),
  authModalTitle: qs("#authModalTitle"),
  loginTabBtn: qs("#loginTabBtn"),
  signupTabBtn: qs("#signupTabBtn"),
  loginForm: qs("#loginForm"),
  signupForm: qs("#signupForm"),
  authOutput: qs("#authOutput"),
  signupPassword: qs("#signupPassword"),
  passwordMeter: qs("#passwordMeter"),
  editModal: qs("#editModal"),
  editForm: qs("#editForm"),
  closeEditModal: qs("#closeEditModal"),
  cancelEditBtn: qs("#cancelEditBtn"),
  assetViewModal: qs("#assetViewModal"),
  assetViewContent: qs("#assetViewContent"),
  viewAssetTitle: qs("#viewAssetTitle"),
  closeAssetViewModal: qs("#closeAssetViewModal"),
  searchInput: qs("#searchInput"),
  typeFilter: qs("#typeFilter"),
  dropZone: qs("#dropZone"),
  mediaFile: qs("#mediaFile"),
  copyHealthBtn: qs("#copyHealthBtn")
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => elements.toast.classList.remove("show"), 3500);
}

function setBusy(button, isBusy, busyText = "Working...") {
  if (!button) return;
  if (isBusy) {
    button.dataset.originalText = button.textContent;
    button.textContent = busyText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

function getAuthHeader() {
  return state.authToken ? { Authorization: `Bearer ${state.authToken}` } : {};
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : { success: false, message: await response.text() };

  if (!response.ok) {
    const validation = Array.isArray(data.errors)
      ? ` ${data.errors.map((error) => `${error.path}: ${error.message}`).join(" ")}`
      : "";
    throw new Error(`${data.message || `Request failed with status ${response.status}`}${validation}`);
  }

  return data;
}

function updateAuthStatus() {
  if (state.currentUser && state.authToken) {
    elements.authStatus.textContent = `Signed in as ${state.currentUser.displayName || state.currentUser.email}`;
    elements.authStatus.classList.add("signed-in");
    elements.openAuthBtn.classList.add("hidden");
    elements.logoutBtn.classList.remove("hidden");
  } else {
    elements.authStatus.textContent = "Not signed in";
    elements.authStatus.classList.remove("signed-in");
    elements.openAuthBtn.classList.remove("hidden");
    elements.logoutBtn.classList.add("hidden");
  }
}

function openAuthModal(mode = "login") {
  elements.authModal.classList.add("open");
  setAuthMode(mode);
}

function closeAuth() {
  elements.authModal.classList.remove("open");
}

function setAuthMode(mode) {
  const isLogin = mode === "login";
  elements.authModalTitle.textContent = isLogin ? "Sign in" : "Create account";
  elements.loginTabBtn.classList.toggle("active", isLogin);
  elements.signupTabBtn.classList.toggle("active", !isLogin);
  elements.loginTabBtn.setAttribute("aria-selected", String(isLogin));
  elements.signupTabBtn.setAttribute("aria-selected", String(!isLogin));
  elements.loginForm.classList.toggle("hidden", !isLogin);
  elements.signupForm.classList.toggle("hidden", isLogin);
  elements.authOutput.textContent = isLogin
    ? "Use your HyMedia account credentials."
    : "Create an account with a strong password. Passwords are hashed before storage.";
}

function passwordScore(password) {
  return [
    password.length >= 10,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password)
  ].filter(Boolean).length;
}

function updatePasswordMeter() {
  const score = passwordScore(elements.signupPassword.value);
  elements.passwordMeter.style.setProperty("--score", `${score * 20}%`);
}

async function signup(event) {
  event.preventDefault();
  const button = event.submitter;
  const payload = {
    displayName: qs("#signupDisplayName").value.trim(),
    email: qs("#signupEmail").value.trim(),
    password: qs("#signupPassword").value
  };

  setBusy(button, true, "Creating...");
  elements.authOutput.textContent = "Creating account...";

  try {
    const response = await fetchJson(`${API_BASE_URL}/api/v1/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    state.authToken = response.token;
    state.currentUser = response.user;
    localStorage.setItem("hymedia_token", state.authToken);
    localStorage.setItem("hymedia_user", JSON.stringify(state.currentUser));

    elements.signupForm.reset();
    updatePasswordMeter();
    updateAuthStatus();
    closeAuth();
    showToast("Account created.");
    await refreshDashboard();
  } catch (error) {
    elements.authOutput.textContent = error.message;
    showToast(error.message);
  } finally {
    setBusy(button, false);
  }
}

async function login(event) {
  event.preventDefault();
  const button = event.submitter;
  const payload = {
    email: qs("#loginEmail").value.trim(),
    password: qs("#loginPassword").value
  };

  setBusy(button, true, "Signing in...");
  elements.authOutput.textContent = "Checking credentials...";

  try {
    const response = await fetchJson(`${API_BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    state.authToken = response.token;
    state.currentUser = response.user;
    localStorage.setItem("hymedia_token", state.authToken);
    localStorage.setItem("hymedia_user", JSON.stringify(state.currentUser));

    elements.loginForm.reset();
    updateAuthStatus();
    closeAuth();
    showToast("Signed in.");
    await refreshDashboard();
  } catch (error) {
    elements.authOutput.textContent = error.message;
    showToast(error.message);
  } finally {
    setBusy(button, false);
  }
}

function logout() {
  state.authToken = "";
  state.currentUser = null;
  localStorage.removeItem("hymedia_token");
  localStorage.removeItem("hymedia_user");
  updateAuthStatus();
  renderAssets();
  showToast("Signed out.");
}

async function loadHealth() {
  try {
    const data = await fetchJson(`${API_BASE_URL}/api/v1/health`);
    elements.healthOutput.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    elements.healthOutput.textContent = `Health check failed: ${error.message}`;
  }
}

async function loadStats() {
  try {
    const response = await fetchJson(`${API_BASE_URL}/api/v1/assets/stats`, {
      headers: getAuthHeader()
    });
    const stats = response.data || {};
    elements.totalAssets.textContent = stats.totalAssets || 0;
    elements.imageAssets.textContent = stats.imageAssets || 0;
    elements.sensitiveAssets.textContent = (stats.sensitiveAssets || 0) + (stats.adult18PlusAssets || 0);
  } catch (error) {
    showToast(`Stats failed: ${error.message}`);
  }
}

async function loadAssets() {
  elements.assetList.innerHTML = skeletonCards();

  try {
    const response = await fetchJson(`${API_BASE_URL}/api/v1/assets`, {
      headers: getAuthHeader()
    });
    state.assets = response.data || [];
    renderAssets();
  } catch (error) {
    elements.assetList.innerHTML = `<p class="empty-state">Failed to load assets. ${escapeHtml(error.message)}</p>`;
  }
}

function formatTags(tags) {
  if (Array.isArray(tags)) return tags;
  if (typeof tags === "string") return tags.split(",").map((tag) => tag.trim()).filter(Boolean);
  return [];
}

function isRestricted(asset) {
  return Boolean(asset.isSensitive || asset.isAdult18Plus);
}

function isOwner(asset) {
  return Boolean(state.currentUser?.userId && asset.ownerId === state.currentUser.userId);
}

function mediaUrl(asset) {
  return `${API_BASE_URL}/api/v1/assets/${encodeURIComponent(asset.assetId)}/media`;
}

function assetMatches(asset) {
  const haystack = [
    asset.title,
    asset.caption,
    asset.location,
    asset.ownerEmail,
    asset.visibility,
    ...formatTags(asset.tags)
  ].join(" ").toLowerCase();

  const matchesSearch = !state.search || haystack.includes(state.search.toLowerCase());
  const matchesType = !state.typeFilter || asset.mediaType === state.typeFilter;
  return matchesSearch && matchesType;
}

function skeletonCards() {
  return Array.from({ length: 6 })
    .map(() => '<article class="asset-card skeleton"><div></div><span></span><span></span><span></span></article>')
    .join("");
}

function renderMedia(asset, mode = "card") {
  const url = mediaUrl(asset);
  const restricted = isRestricted(asset);
  const revealed = state.revealedAssets.has(asset.assetId);
  const blurClass = restricted && !revealed ? "blurred-media" : "";
  const safeTitle = escapeHtml(asset.title || "HyMedia asset");
  let element = '<span class="preview-placeholder">No preview</span>';

  if (asset.mediaType === "image" && asset.blobName) {
    element = `<img class="${blurClass}" src="${url}" alt="${safeTitle}" loading="lazy" />`;
  }

  if (asset.mediaType === "video" && asset.blobName) {
    element = `<video class="${blurClass}" controls preload="metadata" playsinline><source src="${url}" type="${escapeHtml(asset.mimeType || "video/mp4")}" /></video>`;
  }

  if (asset.mediaType === "audio" && asset.blobName) {
    element = `<div class="audio-preview ${blurClass}"><span>Audio asset</span><audio controls preload="metadata"><source src="${url}" type="${escapeHtml(asset.mimeType || "audio/mpeg")}" /></audio></div>`;
  }

  const overlay = restricted && !revealed
    ? `<div class="restricted-overlay"><strong>${asset.isAdult18Plus ? "18+ content" : "Sensitive content"}</strong><span>Hidden until you choose to reveal it.</span><button type="button" data-action="reveal" data-id="${escapeHtml(asset.assetId)}">Reveal</button></div>`
    : "";

  return `<div class="${mode === "detail" ? "detail-media-frame" : "asset-preview"}">${element}${overlay}<span class="asset-pill">${escapeHtml(asset.mediaType || "media")}</span></div>`;
}

function renderAssets() {
  const assets = state.assets.filter(assetMatches);

  if (!assets.length) {
    elements.assetList.innerHTML = '<p class="empty-state">No matching assets in the vault.</p>';
    return;
  }

  elements.assetList.innerHTML = assets
    .map((asset) => {
      const tags = formatTags(asset.tags);
      const ownerLabel = isOwner(asset) ? "You" : asset.ownerEmail || "Unknown";

      return `
        <article class="asset-card" data-action="view" data-id="${escapeHtml(asset.assetId)}">
          ${renderMedia(asset)}
          <div class="asset-body">
            <div class="asset-title-row">
              <h3>${escapeHtml(asset.title || "Untitled asset")}</h3>
              <span class="visibility-pill">${escapeHtml(asset.visibility || "PUBLIC")}</span>
            </div>
            <p>${escapeHtml(asset.caption || "No caption provided.")}</p>
            <div class="tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
            <dl class="meta-grid">
              <dt>Status</dt><dd>${escapeHtml(asset.processingStatus || "READY")}</dd>
              <dt>Owner</dt><dd>${escapeHtml(ownerLabel)}</dd>
              <dt>Location</dt><dd>${escapeHtml(asset.location || "N/A")}</dd>
            </dl>
            <div class="card-actions">
              <button class="btn btn-ghost small" type="button" data-action="edit" data-id="${escapeHtml(asset.assetId)}">Edit</button>
              <button class="btn btn-danger small" type="button" data-action="delete" data-id="${escapeHtml(asset.assetId)}">Delete</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

async function uploadAsset(event) {
  event.preventDefault();

  if (!state.authToken) {
    showToast("Sign in before uploading.");
    openAuthModal("login");
    return;
  }

  if (!elements.mediaFile.files.length) {
    showToast("Choose a media file first.");
    return;
  }

  const button = event.submitter;
  const formData = new FormData();
  formData.append("file", elements.mediaFile.files[0]);
  formData.append("title", qs("#title").value.trim());
  formData.append("caption", qs("#caption").value.trim());
  formData.append("tags", qs("#tags").value.trim());
  formData.append("location", qs("#location").value.trim());
  formData.append("visibility", qs("#visibility").value);
  formData.append("isSensitive", qs("#isSensitive").checked);
  formData.append("isAdult18Plus", qs("#isAdult18Plus").checked);

  setBusy(button, true, "Uploading...");
  elements.uploadOutput.textContent = "Uploading to Azure Blob Storage...";

  try {
    const response = await fetchJson(`${API_BASE_URL}/api/v1/assets/upload`, {
      method: "POST",
      headers: getAuthHeader(),
      body: formData
    });

    elements.uploadOutput.textContent = JSON.stringify(response, null, 2);
    elements.uploadForm.reset();
    showToast("Asset uploaded.");
    await refreshDashboard();
  } catch (error) {
    elements.uploadOutput.textContent = `Upload failed: ${error.message}`;
    showToast(error.message);
  } finally {
    setBusy(button, false);
  }
}

function openAssetView(assetId) {
  const asset = state.assets.find((item) => item.assetId === assetId);
  if (!asset) return;

  const tags = formatTags(asset.tags);
  elements.viewAssetTitle.textContent = asset.title || "HyMedia asset";
  elements.assetViewContent.innerHTML = `
    <div class="asset-detail-layout">
      ${renderMedia(asset, "detail")}
      <div class="asset-detail-info">
        <span class="badge">${escapeHtml(asset.visibility || "PUBLIC")}</span>
        <h3>${escapeHtml(asset.title || "Untitled asset")}</h3>
        <p>${escapeHtml(asset.caption || "No caption provided.")}</p>
        <div class="tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
        <dl class="meta-grid large">
          <dt>Asset ID</dt><dd>${escapeHtml(asset.assetId)}</dd>
          <dt>Media type</dt><dd>${escapeHtml(asset.mediaType || "N/A")}</dd>
          <dt>MIME type</dt><dd>${escapeHtml(asset.mimeType || "N/A")}</dd>
          <dt>Owner</dt><dd>${escapeHtml(asset.ownerEmail || "Unknown")}</dd>
          <dt>Sensitive</dt><dd>${asset.isSensitive ? "Yes" : "No"}</dd>
          <dt>18+</dt><dd>${asset.isAdult18Plus ? "Yes" : "No"}</dd>
        </dl>
        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" data-action="edit" data-id="${escapeHtml(asset.assetId)}">Edit metadata</button>
          <button class="btn btn-danger" type="button" data-action="delete" data-id="${escapeHtml(asset.assetId)}">Delete asset</button>
        </div>
      </div>
    </div>
  `;
  elements.assetViewModal.classList.add("open");
}

function closeAssetView() {
  elements.assetViewModal.classList.remove("open");
}

function openEditModal(assetId) {
  if (!state.authToken) {
    showToast("Sign in before editing.");
    openAuthModal("login");
    return;
  }

  const asset = state.assets.find((item) => item.assetId === assetId);
  if (!asset) return;

  qs("#editAssetId").value = asset.assetId;
  qs("#editTitle").value = asset.title || "";
  qs("#editCaption").value = asset.caption || "";
  qs("#editTags").value = formatTags(asset.tags).join(", ");
  qs("#editLocation").value = asset.location || "";
  qs("#editVisibility").value = asset.visibility || "PUBLIC";
  qs("#editIsSensitive").checked = Boolean(asset.isSensitive);
  qs("#editIsAdult18Plus").checked = Boolean(asset.isAdult18Plus);
  elements.editModal.classList.add("open");
}

function closeEdit() {
  elements.editModal.classList.remove("open");
  elements.editForm.reset();
}

async function submitEdit(event) {
  event.preventDefault();
  const button = event.submitter;
  const assetId = qs("#editAssetId").value;
  const payload = {
    title: qs("#editTitle").value.trim(),
    caption: qs("#editCaption").value.trim(),
    tags: qs("#editTags").value.trim(),
    location: qs("#editLocation").value.trim(),
    visibility: qs("#editVisibility").value,
    isSensitive: qs("#editIsSensitive").checked,
    isAdult18Plus: qs("#editIsAdult18Plus").checked
  };

  setBusy(button, true, "Saving...");

  try {
    await fetchJson(`${API_BASE_URL}/api/v1/assets/${encodeURIComponent(assetId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(payload)
    });

    closeEdit();
    closeAssetView();
    showToast("Metadata saved.");
    await refreshDashboard();
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(button, false);
  }
}

async function deleteAsset(assetId) {
  if (!state.authToken) {
    showToast("Sign in before deleting.");
    openAuthModal("login");
    return;
  }

  if (!window.confirm("Delete this asset and its linked media file?")) return;

  try {
    await fetchJson(`${API_BASE_URL}/api/v1/assets/${encodeURIComponent(assetId)}`, {
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
  await Promise.all([loadHealth(), loadStats(), loadAssets()]);
}

function handleAssetActions(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;
  const id = target.dataset.id;

  if (action === "reveal") {
    event.stopPropagation();
    state.revealedAssets.add(id);
    renderAssets();
    return;
  }

  if (action === "view") openAssetView(id);
  if (action === "edit") {
    event.stopPropagation();
    openEditModal(id);
  }
  if (action === "delete") {
    event.stopPropagation();
    deleteAsset(id);
  }
}

function setupDropZone() {
  ["dragenter", "dragover"].forEach((eventName) => {
    elements.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropZone.classList.add("dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    elements.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropZone.classList.remove("dragging");
    });
  });

  elements.dropZone.addEventListener("drop", (event) => {
    const file = event.dataTransfer.files[0];
    if (!file) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    elements.mediaFile.files = transfer.files;
    showToast(`${file.name} ready to upload.`);
  });
}

function bindEvents() {
  elements.openAuthBtn.addEventListener("click", () => openAuthModal("login"));
  elements.closeAuthModal.addEventListener("click", closeAuth);
  elements.loginTabBtn.addEventListener("click", () => setAuthMode("login"));
  elements.signupTabBtn.addEventListener("click", () => setAuthMode("signup"));
  elements.signupForm.addEventListener("submit", signup);
  elements.loginForm.addEventListener("submit", login);
  elements.logoutBtn.addEventListener("click", logout);
  elements.signupPassword.addEventListener("input", updatePasswordMeter);
  elements.uploadForm.addEventListener("submit", uploadAsset);
  elements.refreshBtn.addEventListener("click", refreshDashboard);
  elements.editForm.addEventListener("submit", submitEdit);
  elements.closeEditModal.addEventListener("click", closeEdit);
  elements.cancelEditBtn.addEventListener("click", closeEdit);
  elements.closeAssetViewModal.addEventListener("click", closeAssetView);
  elements.assetList.addEventListener("click", handleAssetActions);
  elements.assetViewContent.addEventListener("click", handleAssetActions);

  elements.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderAssets();
  });

  elements.typeFilter.addEventListener("change", (event) => {
    state.typeFilter = event.target.value;
    renderAssets();
  });

  elements.copyHealthBtn.addEventListener("click", async () => {
    await navigator.clipboard.writeText(elements.healthOutput.textContent);
    showToast("Health payload copied.");
  });

  [elements.authModal, elements.editModal, elements.assetViewModal].forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) modal.classList.remove("open");
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeAuth();
    closeEdit();
    closeAssetView();
  });

  setupDropZone();
}

bindEvents();
updateAuthStatus();
updatePasswordMeter();
refreshDashboard();
