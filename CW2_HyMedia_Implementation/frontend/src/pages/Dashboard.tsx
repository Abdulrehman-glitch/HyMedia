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
