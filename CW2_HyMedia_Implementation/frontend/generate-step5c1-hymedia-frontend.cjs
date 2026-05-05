const fs = require("fs");

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content.trimStart(), "utf8");
  console.log("Updated " + filePath);
}

console.log("Updating frontend to align with submitted HyMedia CW1 design...");

writeFile("src/types/asset.ts", `
export type MediaType = "image" | "video" | "audio" | "gif";

export type Visibility =
  | "PUBLIC"
  | "PRIVATE_SELECTED"
  | "UNLISTED_LINK"
  | "CREATOR_PREMIUM";

export interface Engagement {
  likeCount: number;
  commentCount: number;
}

export interface AssetAiMetadata {
  tags: string[];
  moderationLabels: string[];
  embeddingRef: string | null;
}

export interface Asset {
  id: string;
  assetId: string;
  ownerId: string;
  title: string;
  caption: string;
  description: string;
  mediaType: MediaType;
  mimeType: string;
  fileName: string;
  blobUrl: string;
  blobName: string;
  hashtags: string[];
  tags: string[];
  taggedUsers: string[];
  locationName: string;
  visibility: Visibility;
  isSensitive: boolean;
  isAdult18Plus: boolean;
  allowComments: boolean;
  processingStatus: string;
  engagement: Engagement;
  ai: AssetAiMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface AssetStats {
  totalAssets: number;
  byMediaType: Record<string, number>;
  byVisibility: Record<string, number>;
  sensitiveCount: number;
  adultCount: number;
  premiumCount: number;
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
  caption: string;
  description: string;
  mediaType: MediaType;
  mimeType: string;
  fileName: string;
  blobUrl: string;
  hashtags: string;
  taggedUsers: string;
  locationName: string;
  visibility: Visibility;
  ownerId: string;
  isSensitive: boolean;
  isAdult18Plus: boolean;
  allowComments: boolean;
}

export interface UpdateAssetPayload {
  title?: string;
  caption?: string;
  description?: string;
  mediaType?: MediaType;
  mimeType?: string;
  fileName?: string;
  blobUrl?: string;
  hashtags?: string;
  taggedUsers?: string;
  locationName?: string;
  visibility?: Visibility;
  isSensitive?: boolean;
  isAdult18Plus?: boolean;
  allowComments?: boolean;
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
    return "No hashtags";
  }

  return tags.join(" ");
}

export function formatTaggedUsers(users: string[]): string {
  if (!users || users.length === 0) {
    return "No tagged users";
  }

  return users.join(" ");
}

export function titleCase(value: string): string {
  if (!value) return "";

  return value
    .replaceAll("_", " ")
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
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
          {asset.visibility === "CREATOR_PREMIUM" && <StatusBadge label="Premium" tone="warning" />}
          {asset.isSensitive && <StatusBadge label="Sensitive" tone="danger" />}
          {asset.isAdult18Plus && <StatusBadge label="18+" tone="danger" />}
        </div>

        <h3>{asset.title}</h3>
        <p>{asset.caption || asset.description || "No caption provided."}</p>

        <div className="asset-tags">{formatTags(asset.hashtags || asset.tags)}</div>

        <div className="asset-meta">
          <span>{titleCase(asset.visibility)}</span>
          <span>{asset.locationName || "No location"}</span>
        </div>

        <div className="asset-meta">
          <span>♥ {asset.engagement?.likeCount ?? 0}</span>
          <span>💬 {asset.allowComments ? asset.engagement?.commentCount ?? 0 : "Off"}</span>
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

      setApiStatus(healthResponse.status || "healthy");
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
    return <LoadingState message="Loading HyMedia dashboard..." />;
  }

  return (
    <section className="page">
      <div className="hero-panel">
        <div>
          <StatusBadge
            label={"API " + apiStatus}
            tone={apiStatus === "healthy" ? "success" : "danger"}
          />
          <h2>HyMedia Dashboard</h2>
          <p>
            HyMedia is a cloud-native multimedia sharing platform for images,
            videos, audio and GIFs with privacy controls, sensitive-content
            metadata, creator-premium visibility and Azure-ready media storage.
          </p>
        </div>

        <div className="hero-actions">
          <Link to="/upload" className="button button-primary">Upload Media Post</Link>
          <Link to="/gallery" className="button button-secondary">View Feed</Link>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="stats-grid">
        <div className="stat-card">
          <span>Total Posts</span>
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
          <span>Premium Posts</span>
          <strong>{stats?.premiumCount ?? 0}</strong>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span>Sensitive Posts</span>
          <strong>{stats?.sensitiveCount ?? 0}</strong>
        </div>

        <div className="stat-card">
          <span>18+ Posts</span>
          <strong>{stats?.adultCount ?? 0}</strong>
        </div>

        <div className="stat-card">
          <span>Private Selected</span>
          <strong>{stats?.byVisibility?.PRIVATE_SELECTED ?? 0}</strong>
        </div>

        <div className="stat-card">
          <span>Unlisted Links</span>
          <strong>{stats?.byVisibility?.UNLISTED_LINK ?? 0}</strong>
        </div>
      </div>

      <div className="content-panel">
        <h3>Latest Feed Item</h3>
        {stats?.latestAsset ? (
          <div className="latest-asset">
            <div>
              <strong>{stats.latestAsset.title}</strong>
              <p>{stats.latestAsset.caption || stats.latestAsset.description}</p>
              <small>Created: {formatDate(stats.latestAsset.createdAt)}</small>
            </div>
            <Link to={"/assets/" + stats.latestAsset.id} className="button button-secondary">
              Open
            </Link>
          </div>
        ) : (
          <p>No media posts uploaded yet.</p>
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
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAssets() {
    try {
      setLoading(true);
      setError("");

      const response = await getAssets({
        mediaType,
        search,
        tag,
        location
      } as any);

      setAssets(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load HyMedia feed.");
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
          <h2>HyMedia Feed</h2>
          <p>Browse media posts with hashtags, locations, privacy states and moderation badges.</p>
        </div>
      </div>

      <form className="filter-panel" onSubmit={handleSubmit}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search captions, users, privacy, tags..."
        />

        <input
          value={tag}
          onChange={(event) => setTag(event.target.value)}
          placeholder="Hashtag, e.g. premium"
        />

        <input
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Location"
        />

        <select value={mediaType} onChange={(event) => setMediaType(event.target.value)}>
          <option value="">All media</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="audio">Audio</option>
          <option value="gif">GIFs</option>
        </select>

        <button className="button button-primary" type="submit">
          Apply
        </button>
      </form>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <LoadingState />
      ) : assets.length === 0 ? (
        <div className="empty-state">
          <h3>No media posts found</h3>
          <p>Try clearing filters or upload a new HyMedia post.</p>
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
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [mimeType, setMimeType] = useState("image/jpeg");
  const [fileName, setFileName] = useState("demo-file.jpg");
  const [blobUrl, setBlobUrl] = useState("https://placehold.co/900x600?text=HyMedia+Upload");
  const [hashtags, setHashtags] = useState("#demo,#hymedia");
  const [taggedUsers, setTaggedUsers] = useState("@demo_creator");
  const [locationName, setLocationName] = useState("London, UK");
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [isSensitive, setIsSensitive] = useState(false);
  const [isAdult18Plus, setIsAdult18Plus] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      const response = await createAsset({
        title,
        caption,
        description,
        mediaType,
        mimeType,
        fileName,
        blobUrl,
        hashtags,
        taggedUsers,
        locationName,
        visibility,
        ownerId: "demo_user",
        isSensitive,
        isAdult18Plus,
        allowComments
      });

      navigate("/assets/" + response.data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create HyMedia post.");
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
          <h2>Create HyMedia Post</h2>
          <p>
            This form mirrors the CW1 upload screen: caption, hashtags, tagged users,
            location, privacy, sensitive-content controls and comment settings.
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
          Caption
          <input
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="Short feed caption..."
          />
        </label>

        <label>
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Longer optional description..."
            rows={3}
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
            Privacy
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as Visibility)}
            >
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE_SELECTED">Private to Selected</option>
              <option value="UNLISTED_LINK">Unlisted Link</option>
              <option value="CREATOR_PREMIUM">Creator Premium</option>
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>
            Hashtags
            <input value={hashtags} onChange={(event) => setHashtags(event.target.value)} />
          </label>

          <label>
            Tagged Users
            <input value={taggedUsers} onChange={(event) => setTaggedUsers(event.target.value)} />
          </label>
        </div>

        <label>
          Location
          <input value={locationName} onChange={(event) => setLocationName(event.target.value)} />
        </label>

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
            placeholder="Will be generated by Azure Blob Storage in the next stage"
          />
        </label>

        <div className="toggle-grid">
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={isSensitive}
              onChange={(event) => setIsSensitive(event.target.checked)}
            />
            Sensitive content
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={isAdult18Plus}
              onChange={(event) => setIsAdult18Plus(event.target.checked)}
            />
            18+ content
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={allowComments}
              onChange={(event) => setAllowComments(event.target.checked)}
            />
            Allow comments
          </label>
        </div>

        <button className="button button-primary" disabled={saving} type="submit">
          {saving ? "Creating..." : "Create HyMedia Post"}
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
import { formatDate, formatTaggedUsers, formatTags, titleCase } from "../utils/formatters";

export default function AssetDetail() {
  const { assetId } = useParams();
  const navigate = useNavigate();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [taggedUsers, setTaggedUsers] = useState("");
  const [locationName, setLocationName] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [isSensitive, setIsSensitive] = useState(false);
  const [isAdult18Plus, setIsAdult18Plus] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
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
      setCaption(loadedAsset.caption || "");
      setDescription(loadedAsset.description || "");
      setHashtags((loadedAsset.hashtags || loadedAsset.tags || []).join(","));
      setTaggedUsers((loadedAsset.taggedUsers || []).join(","));
      setLocationName(loadedAsset.locationName || "");
      setVisibility(loadedAsset.visibility);
      setMediaType(loadedAsset.mediaType);
      setIsSensitive(Boolean(loadedAsset.isSensitive));
      setIsAdult18Plus(Boolean(loadedAsset.isAdult18Plus));
      setAllowComments(Boolean(loadedAsset.allowComments));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load HyMedia post.");
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
        caption,
        description,
        hashtags,
        taggedUsers,
        locationName,
        visibility,
        mediaType,
        isSensitive,
        isAdult18Plus,
        allowComments
      });

      setAsset(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update HyMedia post.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!assetId) return;

    const confirmed = window.confirm("Delete this HyMedia media post?");
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");

      await deleteAsset(assetId);
      navigate("/gallery");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete HyMedia post.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <LoadingState message="Loading HyMedia post..." />;
  }

  if (error && !asset) {
    return (
      <section className="page">
        <ErrorBanner message={error} />
        <Link to="/gallery" className="button button-secondary">Back to Feed</Link>
      </section>
    );
  }

  if (!asset) {
    return (
      <section className="page">
        <div className="empty-state">
          <h3>HyMedia post not found</h3>
          <Link to="/gallery" className="button button-secondary">Back to Feed</Link>
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
            <StatusBadge label={titleCase(asset.visibility)} />
            {asset.visibility === "CREATOR_PREMIUM" && <StatusBadge label="Premium" tone="warning" />}
            {asset.isSensitive && <StatusBadge label="Sensitive" tone="danger" />}
            {asset.isAdult18Plus && <StatusBadge label="18+" tone="danger" />}
          </div>

          <h2>{asset.title}</h2>
          <p>{asset.caption || asset.description}</p>

          <dl className="details-list">
            <div>
              <dt>Asset ID</dt>
              <dd>{asset.id}</dd>
            </div>
            <div>
              <dt>Hashtags</dt>
              <dd>{formatTags(asset.hashtags || asset.tags)}</dd>
            </div>
            <div>
              <dt>Tagged Users</dt>
              <dd>{formatTaggedUsers(asset.taggedUsers)}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{asset.locationName || "No location"}</dd>
            </div>
            <div>
              <dt>Blob URL</dt>
              <dd>{asset.blobUrl || "Pending Azure Blob integration"}</dd>
            </div>
            <div>
              <dt>Engagement</dt>
              <dd>Likes: {asset.engagement?.likeCount ?? 0} | Comments: {asset.allowComments ? asset.engagement?.commentCount ?? 0 : "Disabled"}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{formatDate(asset.createdAt)}</dd>
            </div>
          </dl>
        </div>

        <form className="form-panel" onSubmit={handleUpdate}>
          <h3>Edit HyMedia Metadata</h3>

          {error && <ErrorBanner message={error} />}

          <label>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>

          <label>
            Caption
            <input value={caption} onChange={(event) => setCaption(event.target.value)} />
          </label>

          <label>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </label>

          <label>
            Hashtags
            <input value={hashtags} onChange={(event) => setHashtags(event.target.value)} />
          </label>

          <label>
            Tagged Users
            <input value={taggedUsers} onChange={(event) => setTaggedUsers(event.target.value)} />
          </label>

          <label>
            Location
            <input value={locationName} onChange={(event) => setLocationName(event.target.value)} />
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
            Privacy
            <select value={visibility} onChange={(event) => setVisibility(event.target.value as Visibility)}>
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE_SELECTED">Private to Selected</option>
              <option value="UNLISTED_LINK">Unlisted Link</option>
              <option value="CREATOR_PREMIUM">Creator Premium</option>
            </select>
          </label>

          <div className="toggle-grid">
            <label className="checkbox-row">
              <input type="checkbox" checked={isSensitive} onChange={(event) => setIsSensitive(event.target.checked)} />
              Sensitive
            </label>

            <label className="checkbox-row">
              <input type="checkbox" checked={isAdult18Plus} onChange={(event) => setIsAdult18Plus(event.target.checked)} />
              18+
            </label>

            <label className="checkbox-row">
              <input type="checkbox" checked={allowComments} onChange={(event) => setAllowComments(event.target.checked)} />
              Allow comments
            </label>
          </div>

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

writeFile("src/index.css", fs.readFileSync("src/index.css", "utf8") + `

.toggle-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.checkbox-row {
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(2, 6, 23, 0.5);
  border-radius: 14px;
  padding: 0.85rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.65rem;
  cursor: pointer;
}

.checkbox-row input {
  width: auto;
}

@media (max-width: 860px) {
  .toggle-grid {
    grid-template-columns: 1fr;
  }
}
`);

console.log("Frontend HyMedia alignment complete.");