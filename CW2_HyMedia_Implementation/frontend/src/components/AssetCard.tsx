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
