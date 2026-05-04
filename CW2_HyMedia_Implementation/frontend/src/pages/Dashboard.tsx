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
    return <LoadingState message="Loading dashboard and backend status..." />;
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
