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
