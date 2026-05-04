const fs = require("fs");

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content.trimStart(), "utf8");
  console.log("Updated " + filePath);
}

writeFile("src/services/assetService.ts", `
import type {
  ApiResponse,
  Asset,
  AssetStats,
  CreateAssetPayload,
  UpdateAssetPayload
} from "../types/asset";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

export interface HealthResponse {
  success: boolean;
  service: string;
  status: string;
  version: string;
  environment: string;
  timestamp: string;
}

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
  return request<HealthResponse>("/health");
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
`);

console.log("Dashboard health bug fixed.");