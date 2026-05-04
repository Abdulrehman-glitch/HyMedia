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
