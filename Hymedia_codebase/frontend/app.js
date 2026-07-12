const API_BASE_URL =
  window.HYMEDIA_CONFIG?.API_BASE_URL ||
  "https://hymedia-api-b00968573-ajegdnfpa9braqet.italynorth-01.azurewebsites.net";

const state = {
  assets: [],
  moderationQueue: [],
  users: [],
  sessions: [],
  recycleBin: [],
  revealedAssets: new Set(),
  currentUser: null,
  search: "",
  typeFilter: ""
};

const qs = (selector) => document.querySelector(selector);
const visibilityLabels = {
  PUBLIC: "Public",
  PRIVATE: "Private",
  PRIVATE_SELECTED: "Private",
  UNLISTED: "Unlisted",
  UNLISTED_LINK: "Unlisted",
  ORG_ONLY: "Organisation-only",
  SHARED: "Shared users",
  CREATOR_PREMIUM: "Shared users",
  PASSWORD_PROTECTED: "Password-protected"
};

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
  copyHealthBtn: qs("#copyHealthBtn"),
  moderationNavLink: qs("#moderationNavLink"),
  moderationPanel: qs("#moderationPanel"),
  moderationQueueList: qs("#moderationQueueList"),
  moderationQueueStatus: qs("#moderationQueueStatus"),
  refreshModerationBtn: qs("#refreshModerationBtn"),
  adminNavLink: qs("#adminNavLink"),
  adminPanel: qs("#adminPanel"),
  adminUsersList: qs("#adminUsersList"),
  adminUsersStatus: qs("#adminUsersStatus"),
  refreshAdminUsersBtn: qs("#refreshAdminUsersBtn"),
  accountPanel: qs("#accountPanel"),
  sessionsList: qs("#sessionsList"),
  sessionsStatus: qs("#sessionsStatus"),
  refreshSessionsBtn: qs("#refreshSessionsBtn"),
  recycleList: qs("#recycleList"),
  recycleStatus: qs("#recycleStatus"),
  exportAccountBtn: qs("#exportAccountBtn"),
  deleteAccountBtn: qs("#deleteAccountBtn")
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

function normalizeVisibility(value) {
  const visibility = String(value || "PUBLIC").toUpperCase();
  if (visibility === "PRIVATE_SELECTED") return "PRIVATE";
  if (visibility === "UNLISTED_LINK") return "UNLISTED";
  if (visibility === "CREATOR_PREMIUM") return "SHARED";
  return visibility;
}

function visibilityLabel(value) {
  return visibilityLabels[String(value || "PUBLIC").toUpperCase()] || String(value || "PUBLIC");
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
  return {};
}

async function fetchJson(url, options = {}) {
  const { skipAuthRefresh = false, ...fetchOptions } = options;
  const requestOptions = {
    credentials: "include",
    ...fetchOptions,
    headers: fetchOptions.headers || {}
  };
  let response = await fetch(url, requestOptions);

  if (response.status === 401 && !skipAuthRefresh) {
    const refreshed = await refreshSession();

    if (refreshed) {
      response = await fetch(url, requestOptions);
    }
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : { success: false, message: await response.text() };

  if (!response.ok) {
    const validation = Array.isArray(data.errors)
      ? ` ${data.errors.map((error) => `${error.path}: ${error.message}`).join(" ")}`
      : "";
    const requestId = data.requestId ? ` Request ID: ${data.requestId}.` : "";
    const code = data.code ? ` [${data.code}]` : "";
    throw new Error(`${data.message || `Request failed with status ${response.status}`}${code}${validation}${requestId}`);
  }

  return data;
}

function updateAuthStatus() {
  const canModerate = isModerator();
  const canAdmin = isAdmin();

  if (state.currentUser) {
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

  elements.moderationNavLink.classList.toggle("hidden", !canModerate);
  elements.moderationPanel.classList.toggle("hidden", !canModerate);
  elements.adminNavLink.classList.toggle("hidden", !canAdmin);
  elements.adminPanel.classList.toggle("hidden", !canAdmin);
  elements.accountPanel.classList.toggle("hidden", !state.currentUser);

  if (!canModerate) {
    state.moderationQueue = [];
    elements.moderationQueueList.innerHTML = "";
    elements.moderationQueueStatus.textContent = "Sign in as a moderator or administrator to review reported and quarantined assets.";
  }

  if (!canAdmin) {
    state.users = [];
    elements.adminUsersList.innerHTML = "";
    elements.adminUsersStatus.textContent = "Sign in as an administrator to manage user roles.";
  }

  if (!state.currentUser) {
    state.sessions = [];
    state.recycleBin = [];
    elements.sessionsList.innerHTML = "";
    elements.recycleList.innerHTML = "";
    elements.sessionsStatus.textContent = "Sign in to review logged-in devices.";
    elements.recycleStatus.textContent = "Deleted assets appear here before permanent purge.";
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
  const confirmPassword = qs("#signupPasswordConfirm").value;

  if (payload.password !== confirmPassword) {
    elements.authOutput.textContent = "Passwords do not match.";
    showToast("Passwords do not match.");
    return;
  }

  setBusy(button, true, "Creating...");
  elements.authOutput.textContent = "Creating account...";

  try {
    const response = await fetchJson(`${API_BASE_URL}/api/v1/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      skipAuthRefresh: true
    });

    state.currentUser = response.user;

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
      body: JSON.stringify(payload),
      skipAuthRefresh: true
    });

    state.currentUser = response.user;

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

async function logout() {
  try {
    await fetchJson(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: "POST",
      skipAuthRefresh: true
    });
  } catch (error) {
    showToast(error.message);
  }

  state.currentUser = null;
  localStorage.removeItem("hymedia_token");
  localStorage.removeItem("hymedia_user");
  updateAuthStatus();
  renderAssets();
  showToast("Signed out.");
  await refreshDashboard();
}

async function refreshSession() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include"
    });

    if (!response.ok) {
      state.currentUser = null;
      updateAuthStatus();
      return false;
    }

    const data = await response.json();
    state.currentUser = data.user || null;
    updateAuthStatus();
    return Boolean(state.currentUser);
  } catch (error) {
    return false;
  }
}

async function loadCurrentUser() {
  try {
    const response = await fetchJson(`${API_BASE_URL}/api/v1/auth/me`, {
      skipAuthRefresh: false
    });
    state.currentUser = response.user || null;
  } catch (error) {
    state.currentUser = null;
  }

  localStorage.removeItem("hymedia_token");
  localStorage.removeItem("hymedia_user");
  updateAuthStatus();
}

async function loadHealth() {
  try {
    const [health, readiness] = await Promise.all([
      fetchJson(`${API_BASE_URL}/api/v1/health`),
      fetchJson(`${API_BASE_URL}/api/v1/ready`, { skipAuthRefresh: true }).catch((error) => ({
        success: false,
        status: "not_ready",
        error: error.message
      }))
    ]);

    elements.healthOutput.textContent = JSON.stringify({
      health,
      readiness
    }, null, 2);
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

function isModerator() {
  return state.currentUser?.role === "moderator" || state.currentUser?.role === "admin";
}

function isAdmin() {
  return state.currentUser?.role === "admin";
}

function isMediaBlockedByModeration(asset) {
  return ["quarantined", "removed"].includes(asset.moderationStatus);
}

function moderationReasonLabel(asset) {
  const reasons = Array.isArray(asset.moderationReasons) ? [...asset.moderationReasons] : [];

  if (Number(asset.reportCount || 0) > 0) {
    reasons.unshift(`${Number(asset.reportCount || 0)} report${Number(asset.reportCount || 0) === 1 ? "" : "s"}`);
  }

  return reasons.length ? reasons.join(", ") : "Policy review";
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
    visibilityLabel(asset.visibility),
    asset.moderationStatus,
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
  if (isMediaBlockedByModeration(asset) && !isModerator()) {
    return `<div class="${mode === "detail" ? "detail-media-frame" : "asset-preview"} moderation-blocked"><span>Awaiting moderation review</span><span class="asset-pill">${escapeHtml(asset.mediaType || "media")}</span></div>`;
  }

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
      const canManage = isOwner(asset) || state.currentUser?.role === "admin";
      const canReport = state.currentUser && !canManage;
      const actions = canManage
        ? `
            <div class="card-actions">
              <button class="btn btn-ghost small" type="button" data-action="edit" data-id="${escapeHtml(asset.assetId)}">Edit</button>
              <button class="btn btn-ghost small" type="button" data-action="share" data-id="${escapeHtml(asset.assetId)}">Share</button>
              <button class="btn btn-danger small" type="button" data-action="delete" data-id="${escapeHtml(asset.assetId)}">Delete</button>
            </div>
          `
        : canReport
          ? `
              <div class="card-actions">
                <button class="btn btn-ghost small" type="button" data-action="report" data-id="${escapeHtml(asset.assetId)}">Report</button>
              </div>
            `
          : '<p class="readonly-note">View only</p>';
      const moderationStatus = asset.moderationStatus || "approved";

      return `
        <article class="asset-card" data-action="view" data-id="${escapeHtml(asset.assetId)}">
          ${renderMedia(asset)}
          <div class="asset-body">
            <div class="asset-title-row">
              <h3>${escapeHtml(asset.title || "Untitled asset")}</h3>
              <span class="visibility-pill">${escapeHtml(visibilityLabel(asset.visibility))}</span>
            </div>
            <span class="moderation-pill ${escapeHtml(moderationStatus)}">${escapeHtml(moderationStatus)}</span>
            <p>${escapeHtml(asset.caption || "No caption provided.")}</p>
            <div class="tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
            <dl class="meta-grid">
              <dt>Status</dt><dd>${escapeHtml(asset.processingStatus || "READY")}</dd>
              <dt>Owner</dt><dd>${escapeHtml(ownerLabel)}</dd>
              <dt>Location</dt><dd>${escapeHtml(asset.location || "N/A")}</dd>
            </dl>
            ${actions}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderModerationQueue() {
  if (!isModerator()) return;

  if (!state.moderationQueue.length) {
    elements.moderationQueueList.innerHTML = '<p class="empty-state">No assets currently need moderation review.</p>';
    elements.moderationQueueStatus.textContent = "Queue clear.";
    return;
  }

  elements.moderationQueueStatus.textContent = `${state.moderationQueue.length} asset${state.moderationQueue.length === 1 ? "" : "s"} need review.`;
  elements.moderationQueueList.innerHTML = state.moderationQueue
    .map((asset) => {
      const moderationStatus = asset.moderationStatus || "approved";
      const reasons = moderationReasonLabel(asset);
      const tags = formatTags(asset.tags).slice(0, 4);

      return `
        <article class="moderation-item">
          <div class="moderation-item-main">
            <div>
              <span class="moderation-pill ${escapeHtml(moderationStatus)}">${escapeHtml(moderationStatus)}</span>
              <h3>${escapeHtml(asset.title || "Untitled asset")}</h3>
              <p>${escapeHtml(asset.caption || "No caption provided.")}</p>
            </div>
            <dl class="meta-grid moderation-meta">
              <dt>Owner</dt><dd>${escapeHtml(asset.ownerEmail || "Unknown")}</dd>
              <dt>Reason</dt><dd>${escapeHtml(reasons)}</dd>
              <dt>Reports</dt><dd>${Number(asset.reportCount || 0)}</dd>
              <dt>Asset ID</dt><dd>${escapeHtml(asset.assetId)}</dd>
            </dl>
            <div class="tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
          </div>
          <div class="moderation-actions">
            <button class="btn btn-ghost small" type="button" data-action="moderation-view" data-id="${escapeHtml(asset.assetId)}">View</button>
            <button class="btn btn-ghost small" type="button" data-action="moderation-approve" data-id="${escapeHtml(asset.assetId)}">Approve</button>
            <button class="btn btn-ghost small" type="button" data-action="moderation-sensitive" data-id="${escapeHtml(asset.assetId)}">Mark sensitive</button>
            <button class="btn btn-ghost small" type="button" data-action="moderation-quarantine" data-id="${escapeHtml(asset.assetId)}">Quarantine</button>
            <button class="btn btn-danger small" type="button" data-action="moderation-remove" data-id="${escapeHtml(asset.assetId)}">Remove</button>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadModerationQueue() {
  if (!isModerator()) return;

  elements.moderationQueueStatus.textContent = "Loading moderation queue...";
  elements.moderationQueueList.innerHTML = skeletonCards();

  try {
    const response = await fetchJson(`${API_BASE_URL}/api/v1/moderation/queue`);
    state.moderationQueue = response.data || [];
    renderModerationQueue();
  } catch (error) {
    state.moderationQueue = [];
    elements.moderationQueueStatus.textContent = "Moderation queue failed to load.";
    elements.moderationQueueList.innerHTML = `<p class="empty-state">Unable to load moderation queue. ${escapeHtml(error.message)}</p>`;
  }
}

function renderAdminUsers() {
  if (!isAdmin()) return;

  if (!state.users.length) {
    elements.adminUsersList.innerHTML = '<p class="empty-state">No user accounts found.</p>';
    elements.adminUsersStatus.textContent = "No users found.";
    return;
  }

  elements.adminUsersStatus.textContent = `${state.users.length} user${state.users.length === 1 ? "" : "s"} loaded.`;
  elements.adminUsersList.innerHTML = state.users
    .map((user) => {
      const isCurrentUser = user.userId === state.currentUser?.userId;

      return `
        <article class="admin-user-row">
          <div class="admin-user-main">
            <h3>${escapeHtml(user.displayName || user.email)}</h3>
            <p>${escapeHtml(user.email || "")}</p>
            <dl class="meta-grid admin-user-meta">
              <dt>Role</dt><dd>${escapeHtml(user.role || "user")}</dd>
              <dt>Created</dt><dd>${escapeHtml(user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A")}</dd>
              <dt>Last login</dt><dd>${escapeHtml(user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "N/A")}</dd>
            </dl>
          </div>
          <div class="admin-role-controls">
            <label class="field">
              <span>Role</span>
              <select data-role-user="${escapeHtml(user.userId)}" ${isCurrentUser ? "disabled" : ""}>
                ${["user", "creator", "moderator", "admin"].map((role) => `<option value="${role}" ${role === user.role ? "selected" : ""}>${role}</option>`).join("")}
              </select>
            </label>
            <button class="btn btn-primary small" type="button" data-action="admin-role-save" data-id="${escapeHtml(user.userId)}" ${isCurrentUser ? "disabled" : ""}>Save role</button>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadAdminUsers() {
  if (!isAdmin()) return;

  elements.adminUsersStatus.textContent = "Loading users...";
  elements.adminUsersList.innerHTML = skeletonCards();

  try {
    const response = await fetchJson(`${API_BASE_URL}/api/v1/admin/users`);
    state.users = response.data || [];
    renderAdminUsers();
  } catch (error) {
    state.users = [];
    elements.adminUsersStatus.textContent = "User list failed to load.";
    elements.adminUsersList.innerHTML = `<p class="empty-state">Unable to load users. ${escapeHtml(error.message)}</p>`;
  }
}

async function saveUserRole(userId, button) {
  const roleSelect = elements.adminUsersList.querySelector(`[data-role-user="${CSS.escape(userId)}"]`);
  if (!roleSelect) return;

  setBusy(button, true, "Saving...");

  try {
    await fetchJson(`${API_BASE_URL}/api/v1/admin/users/${encodeURIComponent(userId)}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: roleSelect.value })
    });

    showToast("User role saved.");
    await loadAdminUsers();
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(button, false);
  }
}

async function decideModeration(assetId, decision, button) {
  const note = decision === "approve"
    ? ""
    : window.prompt("Add a short moderator note for this decision.");

  if (note === null) return;

  setBusy(button, true, "Saving...");

  try {
    await fetchJson(`${API_BASE_URL}/api/v1/moderation/${encodeURIComponent(assetId)}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, note: note.trim() })
    });

    showToast("Moderation decision saved.");
    closeAssetView();
    await refreshDashboard();
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(button, false);
  }
}

async function uploadAsset(event) {
  event.preventDefault();

  if (!state.currentUser) {
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
  const asset = state.assets.find((item) => item.assetId === assetId) ||
    state.moderationQueue.find((item) => item.assetId === assetId);
  if (!asset) return;

  const tags = formatTags(asset.tags);
  const canManage = isOwner(asset) || state.currentUser?.role === "admin";
  const canReport = state.currentUser && !canManage;
  const actions = canManage
    ? `
        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" data-action="edit" data-id="${escapeHtml(asset.assetId)}">Edit metadata</button>
          <button class="btn btn-ghost" type="button" data-action="share" data-id="${escapeHtml(asset.assetId)}">Create share link</button>
          <button class="btn btn-danger" type="button" data-action="delete" data-id="${escapeHtml(asset.assetId)}">Delete asset</button>
        </div>
      `
    : canReport
      ? `
          <div class="modal-actions">
            <button class="btn btn-ghost" type="button" data-action="report" data-id="${escapeHtml(asset.assetId)}">Report asset</button>
          </div>
        `
      : '<p class="readonly-note">You can view this public asset, but only the owner can modify it.</p>';

  elements.viewAssetTitle.textContent = asset.title || "HyMedia asset";
  elements.assetViewContent.innerHTML = `
    <div class="asset-detail-layout">
      ${renderMedia(asset, "detail")}
      <div class="asset-detail-info">
        <span class="badge">${escapeHtml(visibilityLabel(asset.visibility))}</span>
        <h3>${escapeHtml(asset.title || "Untitled asset")}</h3>
        <p>${escapeHtml(asset.caption || "No caption provided.")}</p>
        <div class="tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
        <dl class="meta-grid large">
          <dt>Asset ID</dt><dd>${escapeHtml(asset.assetId)}</dd>
          <dt>Media type</dt><dd>${escapeHtml(asset.mediaType || "N/A")}</dd>
          <dt>MIME type</dt><dd>${escapeHtml(asset.mimeType || "N/A")}</dd>
          <dt>Owner</dt><dd>${escapeHtml(asset.ownerEmail || "Unknown")}</dd>
          <dt>Moderation</dt><dd>${escapeHtml(asset.moderationStatus || "approved")}</dd>
          <dt>Reports</dt><dd>${Number(asset.reportCount || 0)}</dd>
          <dt>Sensitive</dt><dd>${asset.isSensitive ? "Yes" : "No"}</dd>
          <dt>18+</dt><dd>${asset.isAdult18Plus ? "Yes" : "No"}</dd>
        </dl>
        ${actions}
      </div>
    </div>
  `;
  elements.assetViewModal.classList.add("open");
}

function closeAssetView() {
  elements.assetViewModal.classList.remove("open");
}

function openEditModal(assetId) {
  if (!state.currentUser) {
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
  qs("#editVisibility").value = normalizeVisibility(asset.visibility);
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
  if (!state.currentUser) {
    showToast("Sign in before deleting.");
    openAuthModal("login");
    return;
  }

  if (!window.confirm("Move this asset to the recycle bin?")) return;

  try {
    await fetchJson(`${API_BASE_URL}/api/v1/assets/${encodeURIComponent(assetId)}`, {
      method: "DELETE",
      headers: getAuthHeader()
    });

    closeAssetView();
    showToast("Asset moved to recycle bin.");
    await refreshDashboard();
  } catch (error) {
    showToast(error.message);
  }
}

async function createShareLinkForAsset(assetId, button) {
  const expiresInHours = Number(window.prompt("Share link lifetime in hours, 1-720.", "24"));

  if (!Number.isFinite(expiresInHours)) return;

  setBusy(button, true, "Sharing...");

  try {
    const response = await fetchJson(`${API_BASE_URL}/api/v1/assets/${encodeURIComponent(assetId)}/share-links`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify({ expiresInHours })
    });

    const shareUrl = response.data?.shareUrl;
    if (shareUrl && navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      showToast("Share link copied.");
    } else if (shareUrl) {
      showToast(shareUrl);
    } else {
      showToast("Share link created.");
    }
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(button, false);
  }
}

function renderSessions() {
  if (!state.currentUser) return;

  if (!state.sessions.length) {
    elements.sessionsList.innerHTML = '<p class="empty-state">No sessions found.</p>';
    elements.sessionsStatus.textContent = "No sessions found.";
    return;
  }

  elements.sessionsStatus.textContent = `${state.sessions.length} session${state.sessions.length === 1 ? "" : "s"} loaded.`;
  elements.sessionsList.innerHTML = state.sessions
    .map((session) => `
      <article class="admin-user-row">
        <div class="admin-user-main">
          <h3>${session.current ? "Current session" : "Signed-in device"}</h3>
          <p>${escapeHtml(session.userAgent || "Unknown device")}</p>
          <dl class="meta-grid admin-user-meta">
            <dt>IP</dt><dd>${escapeHtml(session.ipAddress || "N/A")}</dd>
            <dt>Last used</dt><dd>${escapeHtml(session.lastUsedAt ? new Date(session.lastUsedAt).toLocaleString() : "N/A")}</dd>
            <dt>Expires</dt><dd>${escapeHtml(session.expiresAt ? new Date(session.expiresAt).toLocaleString() : "N/A")}</dd>
            <dt>Revoked</dt><dd>${session.revokedAt ? "Yes" : "No"}</dd>
          </dl>
        </div>
        <div class="admin-role-controls">
          <button class="btn btn-danger small" type="button" data-action="session-revoke" data-id="${escapeHtml(session.sessionId)}" ${session.revokedAt ? "disabled" : ""}>Revoke</button>
        </div>
      </article>
    `)
    .join("");
}

async function loadSessions() {
  if (!state.currentUser) return;

  elements.sessionsStatus.textContent = "Loading sessions...";
  elements.sessionsList.innerHTML = skeletonCards();

  try {
    const response = await fetchJson(`${API_BASE_URL}/api/v1/auth/sessions`);
    state.sessions = response.data || [];
    renderSessions();
  } catch (error) {
    elements.sessionsStatus.textContent = "Sessions failed to load.";
    elements.sessionsList.innerHTML = `<p class="empty-state">Unable to load sessions. ${escapeHtml(error.message)}</p>`;
  }
}

async function revokeSession(sessionId, button) {
  if (!window.confirm("Revoke this session?")) return;

  setBusy(button, true, "Revoking...");

  try {
    await fetchJson(`${API_BASE_URL}/api/v1/auth/sessions/${encodeURIComponent(sessionId)}`, {
      method: "DELETE"
    });
    showToast("Session revoked.");
    await loadSessions();
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(button, false);
  }
}

function renderRecycleBin() {
  if (!state.currentUser) return;

  if (!state.recycleBin.length) {
    elements.recycleList.innerHTML = '<p class="empty-state">Recycle bin is empty.</p>';
    elements.recycleStatus.textContent = "Recycle bin empty.";
    return;
  }

  elements.recycleStatus.textContent = `${state.recycleBin.length} deleted asset${state.recycleBin.length === 1 ? "" : "s"}.`;
  elements.recycleList.innerHTML = state.recycleBin
    .map((asset) => `
      <article class="admin-user-row">
        <div class="admin-user-main">
          <h3>${escapeHtml(asset.title || "Untitled asset")}</h3>
          <p>${escapeHtml(asset.caption || "No caption provided.")}</p>
          <dl class="meta-grid admin-user-meta">
            <dt>Type</dt><dd>${escapeHtml(asset.mediaType || "N/A")}</dd>
            <dt>Deleted</dt><dd>${escapeHtml(asset.deletedAt ? new Date(asset.deletedAt).toLocaleString() : "N/A")}</dd>
          </dl>
        </div>
        <div class="admin-role-controls">
          <button class="btn btn-ghost small" type="button" data-action="asset-restore" data-id="${escapeHtml(asset.assetId)}">Restore</button>
          <button class="btn btn-danger small" type="button" data-action="asset-purge" data-id="${escapeHtml(asset.assetId)}">Purge</button>
        </div>
      </article>
    `)
    .join("");
}

async function loadRecycleBin() {
  if (!state.currentUser) return;

  elements.recycleStatus.textContent = "Loading recycle bin...";
  elements.recycleList.innerHTML = skeletonCards();

  try {
    const response = await fetchJson(`${API_BASE_URL}/api/v1/assets/recycle-bin`);
    state.recycleBin = response.data || [];
    renderRecycleBin();
  } catch (error) {
    elements.recycleStatus.textContent = "Recycle bin failed to load.";
    elements.recycleList.innerHTML = `<p class="empty-state">Unable to load recycle bin. ${escapeHtml(error.message)}</p>`;
  }
}

async function restoreAsset(assetId, button) {
  setBusy(button, true, "Restoring...");

  try {
    await fetchJson(`${API_BASE_URL}/api/v1/assets/${encodeURIComponent(assetId)}/restore`, {
      method: "POST"
    });
    showToast("Asset restored.");
    await refreshDashboard();
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(button, false);
  }
}

async function purgeAsset(assetId, button) {
  if (!window.confirm("Permanently delete this asset and linked media?")) return;

  setBusy(button, true, "Purging...");

  try {
    await fetchJson(`${API_BASE_URL}/api/v1/assets/${encodeURIComponent(assetId)}/purge`, {
      method: "DELETE"
    });
    showToast("Asset permanently deleted.");
    await refreshDashboard();
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(button, false);
  }
}

async function exportAccountData() {
  try {
    const response = await fetchJson(`${API_BASE_URL}/api/v1/auth/export`);
    const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hymedia-account-export-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Account export generated.");
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteAccount() {
  if (!window.confirm("Delete this account? This revokes sessions and anonymises the user record.")) return;

  try {
    await fetchJson(`${API_BASE_URL}/api/v1/auth/account`, {
      method: "DELETE"
    });
    state.currentUser = null;
    updateAuthStatus();
    showToast("Account deleted.");
    await refreshDashboard();
  } catch (error) {
    showToast(error.message);
  }
}

async function reportAsset(assetId) {
  if (!state.currentUser) {
    showToast("Sign in before reporting.");
    openAuthModal("login");
    return;
  }

  const note = window.prompt("Briefly describe the issue with this asset.");
  if (note === null) return;

  try {
    await fetchJson(`${API_BASE_URL}/api/v1/assets/${encodeURIComponent(assetId)}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify({
        reason: "other",
        note: note.trim()
      })
    });

    closeAssetView();
    showToast("Report submitted for review.");
    await refreshDashboard();
  } catch (error) {
    showToast(error.message);
  }
}

async function refreshDashboard() {
  await Promise.all([
    loadHealth(),
    loadStats(),
    loadAssets(),
    loadModerationQueue(),
    loadAdminUsers(),
    loadSessions(),
    loadRecycleBin()
  ]);
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
  if (action === "share") {
    event.stopPropagation();
    createShareLinkForAsset(id, target);
  }
  if (action === "report") {
    event.stopPropagation();
    reportAsset(id);
  }
  if (action === "moderation-view") {
    event.stopPropagation();
    openAssetView(id);
  }
  if (action === "moderation-approve") {
    event.stopPropagation();
    decideModeration(id, "approve", target);
  }
  if (action === "moderation-sensitive") {
    event.stopPropagation();
    decideModeration(id, "mark_sensitive", target);
  }
  if (action === "moderation-quarantine") {
    event.stopPropagation();
    decideModeration(id, "quarantine", target);
  }
  if (action === "moderation-remove") {
    event.stopPropagation();
    decideModeration(id, "remove", target);
  }
  if (action === "admin-role-save") {
    event.stopPropagation();
    saveUserRole(id, target);
  }
  if (action === "session-revoke") {
    event.stopPropagation();
    revokeSession(id, target);
  }
  if (action === "asset-restore") {
    event.stopPropagation();
    restoreAsset(id, target);
  }
  if (action === "asset-purge") {
    event.stopPropagation();
    purgeAsset(id, target);
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
  elements.moderationQueueList.addEventListener("click", handleAssetActions);
  elements.refreshModerationBtn.addEventListener("click", loadModerationQueue);
  elements.adminUsersList.addEventListener("click", handleAssetActions);
  elements.refreshAdminUsersBtn.addEventListener("click", loadAdminUsers);
  elements.sessionsList.addEventListener("click", handleAssetActions);
  elements.recycleList.addEventListener("click", handleAssetActions);
  elements.refreshSessionsBtn.addEventListener("click", loadSessions);
  elements.exportAccountBtn.addEventListener("click", exportAccountData);
  elements.deleteAccountBtn.addEventListener("click", deleteAccount);

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

async function init() {
  bindEvents();
  updatePasswordMeter();
  await loadCurrentUser();
  await refreshDashboard();
}

init();
