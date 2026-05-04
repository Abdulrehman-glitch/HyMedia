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
        </div>

        <h3>{asset.title}</h3>
        <p>{asset.description || "No description provided."}</p>

        <div className="asset-tags">{formatTags(asset.tags)}</div>

        <div className="asset-meta">
          <span>{asset.visibility}</span>
          <span>{formatDate(asset.createdAt)}</span>
        </div>

        <Link to={"/assets/" + asset.id} className="button button-secondary">
          View Details
        </Link>
      </div>
    </article>
  );
}
