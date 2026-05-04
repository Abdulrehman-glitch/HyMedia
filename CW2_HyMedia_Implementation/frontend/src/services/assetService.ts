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
