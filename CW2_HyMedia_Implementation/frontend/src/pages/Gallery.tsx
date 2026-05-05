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
