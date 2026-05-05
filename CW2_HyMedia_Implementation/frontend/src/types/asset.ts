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
