const fs = require("fs");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content.trimStart(), "utf8");
  console.log("Wrote " + filePath);
}

console.log("Generating HyMedia Step 5C frontend files...");

ensureDir("src/components");
ensureDir("src/pages");
ensureDir("src/services");
ensureDir("src/types");
ensureDir("src/utils");

writeFile(".env", `
VITE_API_BASE_URL=http://localhost:5000/api/v1
`);

writeFile(".env.example", `
VITE_API_BASE_URL=http://localhost:5000/api/v1
`);

writeFile("src/types/asset.ts", `
export type MediaType = "image" | "video" | "audio" | "gif";

export type Visibility = "PUBLIC" | "PRIVATE" | "UNLISTED";

export interface Engagement {
  likeCount: number;
  commentCount: number;
}

export interface Asset {
  id: string;
  assetId: string;
  ownerId: string;
  title: string;
  description: string;
  mediaType: MediaType;
  mimeType: string;
  fileName: string;
  blobUrl: string;
  blobName: string;
  tags: string[];
  visibility: Visibility;
  isSensitive: boolean;
  isAdult18Plus: boolean;
  processingStatus: string;
  engagement: Engagement;
  createdAt: string;
  updatedAt: string;
}

export interface AssetStats {
  totalAssets: number;
  byMediaType: Record<string, number>;
  byVisibility: Record<string, number>;
  latestAsset: Asset | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

export interface CreateAssetPayload {
  title: string;
  description: string;
  mediaType: MediaType;
  mimeType: string;
  fileName: string;
  blobUrl: string;
  tags: string;
  visibility: Visibility;
  ownerId: string;
}

export interface UpdateAssetPayload {
  title?: string;
  description?: string;
  mediaType?: MediaType;
  mimeType?: string;
  fileName?: string;
  blobUrl?: string;
  tags?: string;
  visibility?: Visibility;
}
`);

writeFile("src/services/assetService.ts", `
import type {
  ApiResponse,
  Asset,
  AssetStats,
  CreateAssetPayload,
  UpdateAssetPayload
} from "../types/asset";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(API_BASE_URL + path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const body = await response.json();

  if (!response.ok) {
    const message = body?.details?.length
      ? body.details.join(" ")
      : body?.message || "API request failed.";

    throw new Error(message);
  }

  return body as T;
}

export async function getHealth() {
  return request<ApiResponse<Record<string, unknown>>>("/health");
}

export async function getAssets(params?: {
  mediaType?: string;
  tag?: string;
  search?: string;
}) {
  const query = new URLSearchParams();

  if (params?.mediaType) query.set("mediaType", params.mediaType);
  if (params?.tag) query.set("tag", params.tag);
  if (params?.search) query.set("search", params.search);

  const suffix = query.toString() ? "?" + query.toString() : "";

  return request<ApiResponse<Asset[]>>("/assets" + suffix);
}

export async function getAssetStats() {
  return request<ApiResponse<AssetStats>>("/assets/stats");
}

export async function getAssetById(assetId: string) {
  return request<ApiResponse<Asset>>("/assets/" + assetId);
}

export async function createAsset(payload: CreateAssetPayload) {
  return request<ApiResponse<Asset>>("/assets", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateAsset(assetId: string, payload: UpdateAssetPayload) {
  return request<ApiResponse<Asset>>("/assets/" + assetId, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteAsset(assetId: string) {
  return request<ApiResponse<Asset>>("/assets/" + assetId, {
    method: "DELETE"
  });
}
`);

writeFile("src/utils/formatters.ts", `
export function formatDate(value: string): string {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatTags(tags: string[]): string {
  if (!tags || tags.length === 0) {
    return "No tags";
  }

  return tags.map((tag) => "#" + tag).join(" ");
}

export function titleCase(value: string): string {
  if (!value) return "";

  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
`);

writeFile("src/components/Navbar.tsx", `
import { NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="brand">
        <div className="brand-mark">H</div>
        <div>
          <h1>HyMedia</h1>
          <p>Cloud-native multimedia platform</p>
        </div>
      </div>

      <nav className="nav-links">
        <NavLink to="/">Dashboard</NavLink>
        <NavLink to="/gallery">Gallery</NavLink>
        <NavLink to="/upload">Upload</NavLink>
      </nav>
    </header>
  );
}
`);

writeFile("src/components/StatusBadge.tsx", `
interface StatusBadgeProps {
  label: string;
  tone?: "success" | "warning" | "neutral" | "danger";
}

export default function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return <span className={"badge badge-" + tone}>{label}</span>;
}
`);

writeFile("src/components/LoadingState.tsx", `
interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = "Loading HyMedia data..." }: LoadingStateProps) {
  return (
    <div className="loading-card">
      <div className="spinner" />
      <p>{message}</p>
    </div>
  );
}
`);

writeFile("src/components/ErrorBanner.tsx", `
interface ErrorBannerProps {
  message: string;
}

export default function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <div className="error-banner">
      <strong>Something went wrong.</strong>
      <span>{message}</span>
    </div>
  );
}
`);

writeFile("src/components/MediaPreview.tsx", `
import type { Asset } from "../types/asset";

interface MediaPreviewProps {
  asset: Asset;
}

export default function MediaPreview({ asset }: MediaPreviewProps) {
  if (!asset.blobUrl) {
    return (
      <div className="media-placeholder">
        <span>{asset.mediaType.toUpperCase()}</span>
        <small>Media URL pending Azure Blob integration</small>
      </div>
    );
  }

  if (asset.mediaType === "image" || asset.mediaType === "gif") {
    return <img src={asset.blobUrl} alt={asset.title} className="media-image" />;
  }

  if (asset.mediaType === "video") {
    return (
      <video className="media-video" controls>
        <source src={asset.blobUrl} type={asset.mimeType || "video/mp4"} />
        Your browser does not support video playback.
      </video>
    );
  }

  if (asset.mediaType === "audio") {
    return (
      <div className="audio-preview">
        <span>Audio Asset</span>
        <audio controls>
          <source src={asset.blobUrl} type={asset.mimeType || "audio/mpeg"} />
          Your browser does not support audio playback.
        </audio>
      </div>
    );
  }

  return (
    <div className="media-placeholder">
      <span>{asset.mediaType.toUpperCase()}</span>
    </div>
  );
}
`);

writeFile("src/components/AssetCard.tsx", `
import { Link } from "react-router-dom";
import type { Asset } from "../types/asset";
import { formatDate, formatTags, titleCase } from "../utils/formatters";
import MediaPreview from "./MediaPreview";
import StatusBadge from "./StatusBadge";

interface AssetCardProps {
  asset: Asset;
}

export default function AssetCard({ asset }: AssetCardProps) {
  return (
    <article className="asset-card">
      <div className="asset-media">
        <MediaPreview asset={asset} />
      </div>

      <div className="asset-content">
        <div className="asset-card-header">
          <StatusBadge label={titleCase(asset.mediaType)} tone="neutral" />
          <StatusBadge
            label={asset.processingStatus}
            tone={asset.processingStatus === "READY" ? "success" : "warning"}
          />
        </div>

        <h3>{asset.title}</h3>
        <p>{asset.description || "No description provided."}</p>

        <div className="asset-tags">{formatTags(asset.tags)}</div>

        <div className="asset-meta">
          <span>{asset.visibility}</span>
          <span>{formatDate(asset.createdAt)}</span>
        </div>

        <Link to={"/assets/" + asset.id} className="button button-secondary">
          View Details
        </Link>
      </div>
    </article>
  );
}
`);

writeFile("src/pages/Dashboard.tsx", `
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ErrorBanner from "../components/ErrorBanner";
import LoadingState from "../components/LoadingState";
import StatusBadge from "../components/StatusBadge";
import { getAssetStats, getHealth } from "../services/assetService";
import type { AssetStats } from "../types/asset";
import { formatDate } from "../utils/formatters";

export default function Dashboard() {
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [apiStatus, setApiStatus] = useState("Checking...");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const [healthResponse, statsResponse] = await Promise.all([
        getHealth(),
        getAssetStats()
      ]);

      setApiStatus(String(healthResponse.data.status || "healthy"));
      setStats(statsResponse.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard.");
      setApiStatus("offline");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return <LoadingState message="Loading dashboard and backend status..." />;
  }

  return (
    <section className="page">
      <div className="hero-panel">
        <div>
          <StatusBadge label={"API " + apiStatus} tone={apiStatus === "healthy" ? "success" : "danger"} />
          <h2>HyMedia Dashboard</h2>
          <p>
            A cloud-native multimedia platform for uploading, storing, managing and
            retrieving media assets using Azure-ready APIs.
          </p>
        </div>

        <div className="hero-actions">
          <Link to="/upload" className="button button-primary">Upload Asset</Link>
          <Link to="/gallery" className="button button-secondary">View Gallery</Link>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="stats-grid">
        <div className="stat-card">
          <span>Total Assets</span>
          <strong>{stats?.totalAssets ?? 0}</strong>
        </div>

        <div className="stat-card">
          <span>Images</span>
          <strong>{stats?.byMediaType?.image ?? 0}</strong>
        </div>

        <div className="stat-card">
          <span>Videos</span>
          <strong>{stats?.byMediaType?.video ?? 0}</strong>
        </div>

        <div className="stat-card">
          <span>Public Assets</span>
          <strong>{stats?.byVisibility?.PUBLIC ?? 0}</strong>
        </div>
      </div>

      <div className="content-panel">
        <h3>Latest Asset</h3>
        {stats?.latestAsset ? (
          <div className="latest-asset">
            <div>
              <strong>{stats.latestAsset.title}</strong>
              <p>{stats.latestAsset.description}</p>
              <small>Created: {formatDate(stats.latestAsset.createdAt)}</small>
            </div>
            <Link to={"/assets/" + stats.latestAsset.id} className="button button-secondary">
              Open
            </Link>
          </div>
        ) : (
          <p>No assets uploaded yet.</p>
        )}
      </div>
    </section>
  );
}
`);

writeFile("src/pages/Gallery.tsx", `
import { useEffect, useState } from "react";
import AssetCard from "../components/AssetCard";
import ErrorBanner from "../components/ErrorBanner";
import LoadingState from "../components/LoadingState";
import { getAssets } from "../services/assetService";
import type { Asset } from "../types/asset";

export default function Gallery() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [mediaType, setMediaType] = useState("");
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAssets() {
    try {
      setLoading(true);
      setError("");

      const response = await getAssets({
        mediaType,
        search,
        tag
      });

      setAssets(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assets.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssets();
  }, []);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    loadAssets();
  }

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <h2>Media Gallery</h2>
          <p>Browse uploaded HyMedia assets from the backend REST API.</p>
        </div>
      </div>

      <form className="filter-panel" onSubmit={handleSubmit}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search title, description, tags..."
        />

        <input
          value={tag}
          onChange={(event) => setTag(event.target.value)}
          placeholder="Filter by tag, e.g. cloud"
        />

        <select value={mediaType} onChange={(event) => setMediaType(event.target.value)}>
          <option value="">All media</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="audio">Audio</option>
          <option value="gif">GIFs</option>
        </select>

        <button className="button button-primary" type="submit">
          Apply Filters
        </button>
      </form>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <LoadingState />
      ) : assets.length === 0 ? (
        <div className="empty-state">
          <h3>No assets found</h3>
          <p>Try clearing filters or upload a new asset.</p>
        </div>
      ) : (
        <div className="asset-grid">
          {assets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}
    </section>
  );
}
`);

writeFile("src/pages/Upload.tsx", `
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ErrorBanner from "../components/ErrorBanner";
import { createAsset } from "../services/assetService";
import type { MediaType, Visibility } from "../types/asset";

export default function Upload() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [mimeType, setMimeType] = useState("image/jpeg");
  const [fileName, setFileName] = useState("demo-file.jpg");
  const [blobUrl, setBlobUrl] = useState("https://placehold.co/900x600?text=HyMedia+Upload");
  const [tags, setTags] = useState("demo,hymedia");
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      const response = await createAsset({
        title,
        description,
        mediaType,
        mimeType,
        fileName,
        blobUrl,
        tags,
        visibility,
        ownerId: "demo_user"
      });

      navigate("/assets/" + response.data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create asset.");
    } finally {
      setSaving(false);
    }
  }

  function handleMediaTypeChange(value: MediaType) {
    setMediaType(value);

    if (value === "image") {
      setMimeType("image/jpeg");
      setFileName("demo-image.jpg");
      setBlobUrl("https://placehold.co/900x600?text=HyMedia+Image");
    }

    if (value === "video") {
      setMimeType("video/mp4");
      setFileName("demo-video.mp4");
      setBlobUrl("");
    }

    if (value === "audio") {
      setMimeType("audio/mpeg");
      setFileName("demo-audio.mp3");
      setBlobUrl("");
    }

    if (value === "gif") {
      setMimeType("image/gif");
      setFileName("demo-animation.gif");
      setBlobUrl("https://placehold.co/900x600?text=HyMedia+GIF");
    }
  }

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <h2>Upload Asset Metadata</h2>
          <p>
            Current stage creates metadata through the REST API. Actual Azure Blob
            file upload comes in the next backend stage.
          </p>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      <form className="form-panel" onSubmit={handleSubmit}>
        <label>
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Example: London Food Clip"
            required
          />
        </label>

        <label>
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe this media asset..."
            rows={4}
          />
        </label>

        <div className="form-row">
          <label>
            Media Type
            <select
              value={mediaType}
              onChange={(event) => handleMediaTypeChange(event.target.value as MediaType)}
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="gif">GIF</option>
            </select>
          </label>

          <label>
            Visibility
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as Visibility)}
            >
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
              <option value="UNLISTED">Unlisted</option>
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>
            MIME Type
            <input value={mimeType} onChange={(event) => setMimeType(event.target.value)} />
          </label>

          <label>
            File Name
            <input value={fileName} onChange={(event) => setFileName(event.target.value)} />
          </label>
        </div>

        <label>
          Blob URL / Placeholder URL
          <input
            value={blobUrl}
            onChange={(event) => setBlobUrl(event.target.value)}
            placeholder="Will be generated by Azure Blob Storage later"
          />
        </label>

        <label>
          Tags
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="cloud,azure,demo"
          />
        </label>

        <button className="button button-primary" disabled={saving} type="submit">
          {saving ? "Creating..." : "Create Asset"}
        </button>
      </form>
    </section>
  );
}
`);

writeFile("src/pages/AssetDetail.tsx", `
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ErrorBanner from "../components/ErrorBanner";
import LoadingState from "../components/LoadingState";
import MediaPreview from "../components/MediaPreview";
import StatusBadge from "../components/StatusBadge";
import { deleteAsset, getAssetById, updateAsset } from "../services/assetService";
import type { Asset, MediaType, Visibility } from "../types/asset";
import { formatDate, formatTags, titleCase } from "../utils/formatters";

export default function AssetDetail() {
  const { assetId } = useParams();
  const navigate = useNavigate();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function loadAsset() {
    if (!assetId) return;

    try {
      setLoading(true);
      setError("");

      const response = await getAssetById(assetId);
      const loadedAsset = response.data;

      setAsset(loadedAsset);
      setTitle(loadedAsset.title);
      setDescription(loadedAsset.description);
      setTags(loadedAsset.tags.join(","));
      setVisibility(loadedAsset.visibility);
      setMediaType(loadedAsset.mediaType);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load asset.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAsset();
  }, [assetId]);

  async function handleUpdate(event: React.FormEvent) {
    event.preventDefault();

    if (!assetId) return;

    try {
      setSaving(true);
      setError("");

      const response = await updateAsset(assetId, {
        title,
        description,
        tags,
        visibility,
        mediaType
      });

      setAsset(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update asset.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!assetId) return;

    const confirmed = window.confirm("Delete this asset metadata record?");
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");

      await deleteAsset(assetId);
      navigate("/gallery");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete asset.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <LoadingState message="Loading asset details..." />;
  }

  if (error && !asset) {
    return (
      <section className="page">
        <ErrorBanner message={error} />
        <Link to="/gallery" className="button button-secondary">Back to Gallery</Link>
      </section>
    );
  }

  if (!asset) {
    return (
      <section className="page">
        <div className="empty-state">
          <h3>Asset not found</h3>
          <Link to="/gallery" className="button button-secondary">Back to Gallery</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="detail-grid">
        <div className="content-panel">
          <MediaPreview asset={asset} />

          <div className="asset-detail-meta">
            <StatusBadge label={titleCase(asset.mediaType)} />
            <StatusBadge
              label={asset.processingStatus}
              tone={asset.processingStatus === "READY" ? "success" : "warning"}
            />
            <StatusBadge label={asset.visibility} />
          </div>

          <h2>{asset.title}</h2>
          <p>{asset.description}</p>

          <dl className="details-list">
            <div>
              <dt>Asset ID</dt>
              <dd>{asset.id}</dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd>{asset.ownerId}</dd>
            </div>
            <div>
              <dt>File Name</dt>
              <dd>{asset.fileName || "Not available"}</dd>
            </div>
            <div>
              <dt>Blob URL</dt>
              <dd>{asset.blobUrl || "Pending Azure Blob integration"}</dd>
            </div>
            <div>
              <dt>Tags</dt>
              <dd>{formatTags(asset.tags)}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{formatDate(asset.createdAt)}</dd>
            </div>
          </dl>
        </div>

        <form className="form-panel" onSubmit={handleUpdate}>
          <h3>Edit Metadata</h3>

          {error && <ErrorBanner message={error} />}

          <label>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>

          <label>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
            />
          </label>

          <label>
            Tags
            <input value={tags} onChange={(event) => setTags(event.target.value)} />
          </label>

          <label>
            Media Type
            <select value={mediaType} onChange={(event) => setMediaType(event.target.value as MediaType)}>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="gif">GIF</option>
            </select>
          </label>

          <label>
            Visibility
            <select value={visibility} onChange={(event) => setVisibility(event.target.value as Visibility)}>
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
              <option value="UNLISTED">Unlisted</option>
            </select>
          </label>

          <div className="form-actions">
            <button className="button button-primary" disabled={saving} type="submit">
              {saving ? "Saving..." : "Save Changes"}
            </button>

            <button
              className="button button-danger"
              disabled={deleting}
              type="button"
              onClick={handleDelete}
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
`);

writeFile("src/App.tsx", `
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Gallery from "./pages/Gallery";
import Upload from "./pages/Upload";
import AssetDetail from "./pages/AssetDetail";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar />

        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/assets/:assetId" element={<AssetDetail />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
`);

writeFile("src/main.tsx", `
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`);

writeFile("src/index.css", `
:root {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #e5f3ff;
  background: #07111f;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  background:
    radial-gradient(circle at top left, rgba(51, 143, 255, 0.22), transparent 32rem),
    radial-gradient(circle at top right, rgba(65, 255, 184, 0.12), transparent 28rem),
    #07111f;
}

a {
  color: inherit;
  text-decoration: none;
}

button,
input,
select,
textarea {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
}

.navbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  align-items: center;
  padding: 1rem 2rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(7, 17, 31, 0.82);
  backdrop-filter: blur(18px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.brand-mark {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #2f80ed, #22c55e);
  font-weight: 900;
  font-size: 1.5rem;
  box-shadow: 0 18px 40px rgba(47, 128, 237, 0.25);
}

.brand h1 {
  margin: 0;
  font-size: 1.15rem;
}

.brand p {
  margin: 0.15rem 0 0;
  color: #94a3b8;
  font-size: 0.85rem;
}

.nav-links {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.nav-links a {
  color: #b8c8dc;
  padding: 0.65rem 0.9rem;
  border-radius: 999px;
  transition: 0.2s ease;
}

.nav-links a:hover,
.nav-links a.active {
  color: #ffffff;
  background: rgba(47, 128, 237, 0.22);
}

main {
  width: min(1180px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 2rem 0 4rem;
}

.page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.hero-panel,
.content-panel,
.form-panel,
.filter-panel,
.asset-card,
.loading-card,
.empty-state,
.stat-card {
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.78);
  border-radius: 26px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.25);
}

.hero-panel {
  display: flex;
  justify-content: space-between;
  gap: 2rem;
  padding: 2rem;
  align-items: center;
}

.hero-panel h2,
.page-heading h2 {
  margin: 0.6rem 0;
  font-size: clamp(2rem, 5vw, 4rem);
  line-height: 0.95;
}

.hero-panel p,
.page-heading p {
  color: #a7b8cc;
  max-width: 720px;
  line-height: 1.7;
}

.hero-actions,
.form-actions {
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.page-heading {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: end;
}

.button {
  border: 0;
  border-radius: 14px;
  padding: 0.8rem 1rem;
  cursor: pointer;
  font-weight: 800;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.button:hover {
  transform: translateY(-1px);
}

.button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.button-primary {
  background: linear-gradient(135deg, #2f80ed, #22c55e);
  color: white;
}

.button-secondary {
  background: rgba(148, 163, 184, 0.16);
  color: #e5f3ff;
}

.button-danger {
  background: rgba(239, 68, 68, 0.18);
  color: #fecaca;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.stat-card {
  padding: 1.3rem;
}

.stat-card span {
  color: #94a3b8;
}

.stat-card strong {
  display: block;
  margin-top: 0.5rem;
  font-size: 2.4rem;
}

.content-panel {
  padding: 1.5rem;
}

.latest-asset {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.latest-asset p {
  color: #a7b8cc;
}

.filter-panel {
  display: grid;
  grid-template-columns: 1.4fr 1fr 0.8fr auto;
  gap: 0.8rem;
  padding: 1rem;
}

input,
select,
textarea {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(2, 6, 23, 0.72);
  color: #e5f3ff;
  border-radius: 14px;
  padding: 0.85rem 0.9rem;
  outline: none;
}

textarea {
  resize: vertical;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  color: #cbd5e1;
  font-weight: 700;
}

.form-panel {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.asset-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.2rem;
}

.asset-card {
  overflow: hidden;
}

.asset-media {
  height: 260px;
  background: rgba(2, 6, 23, 0.7);
}

.media-image,
.media-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-placeholder,
.audio-preview {
  width: 100%;
  height: 100%;
  display: grid;
  gap: 0.5rem;
  place-items: center;
  text-align: center;
  color: #94a3b8;
  background:
    linear-gradient(135deg, rgba(47, 128, 237, 0.2), rgba(34, 197, 94, 0.08)),
    rgba(2, 6, 23, 0.6);
}

.media-placeholder span {
  font-weight: 900;
  font-size: 2rem;
}

.asset-content {
  padding: 1.2rem;
}

.asset-card-header,
.asset-detail-meta {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.asset-content h3 {
  margin: 1rem 0 0.4rem;
}

.asset-content p {
  color: #a7b8cc;
  line-height: 1.55;
}

.asset-tags {
  color: #7dd3fc;
  margin: 0.8rem 0;
}

.asset-meta {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  color: #94a3b8;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.badge {
  border-radius: 999px;
  padding: 0.35rem 0.65rem;
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0.02em;
}

.badge-neutral {
  background: rgba(148, 163, 184, 0.15);
  color: #cbd5e1;
}

.badge-success {
  background: rgba(34, 197, 94, 0.16);
  color: #86efac;
}

.badge-warning {
  background: rgba(245, 158, 11, 0.16);
  color: #fcd34d;
}

.badge-danger {
  background: rgba(239, 68, 68, 0.16);
  color: #fca5a5;
}

.loading-card,
.empty-state {
  min-height: 280px;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 2rem;
  color: #a7b8cc;
}

.spinner {
  width: 42px;
  height: 42px;
  border: 4px solid rgba(148, 163, 184, 0.2);
  border-top-color: #38bdf8;
  border-radius: 999px;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem;
}

.error-banner {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  border: 1px solid rgba(239, 68, 68, 0.3);
  background: rgba(127, 29, 29, 0.22);
  color: #fecaca;
  border-radius: 18px;
  padding: 1rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1.35fr 0.85fr;
  gap: 1.2rem;
  align-items: start;
}

.details-list {
  display: grid;
  gap: 0.9rem;
  margin-top: 1.5rem;
}

.details-list div {
  border-top: 1px solid rgba(148, 163, 184, 0.16);
  padding-top: 0.8rem;
}

.details-list dt {
  color: #94a3b8;
  font-weight: 800;
}

.details-list dd {
  margin: 0.25rem 0 0;
  color: #e5f3ff;
  word-break: break-word;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 860px) {
  .navbar,
  .hero-panel,
  .page-heading,
  .latest-asset {
    flex-direction: column;
    align-items: stretch;
  }

  .stats-grid,
  .asset-grid,
  .detail-grid,
  .filter-panel,
  .form-row {
    grid-template-columns: 1fr;
  }

  main {
    width: min(100% - 1rem, 1180px);
  }
}
`);

console.log("Step 5C frontend files generated successfully.");
console.log("Run: npm run dev");