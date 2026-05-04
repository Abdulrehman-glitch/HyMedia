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
