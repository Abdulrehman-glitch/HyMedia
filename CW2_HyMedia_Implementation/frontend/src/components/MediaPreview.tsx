import type { Asset } from "../types/asset";

interface MediaPreviewProps {
  asset: Asset;
}

export default function MediaPreview({ asset }: MediaPreviewProps) {
  if (!asset.blobUrl) {
    return (
      <div className="media-placeholder">
        <span>{asset.mediaType.toUpperCase()}</span>
        <small>Media URL pending Azure Blob integration</small>
      </div>
    );
  }

  if (asset.mediaType === "image" || asset.mediaType === "gif") {
    return <img src={asset.blobUrl} alt={asset.title} className="media-image" />;
  }

  if (asset.mediaType === "video") {
    return (
      <video className="media-video" controls>
        <source src={asset.blobUrl} type={asset.mimeType || "video/mp4"} />
        Your browser does not support video playback.
      </video>
    );
  }

  if (asset.mediaType === "audio") {
    return (
      <div className="audio-preview">
        <span>Audio Asset</span>
        <audio controls>
          <source src={asset.blobUrl} type={asset.mimeType || "audio/mpeg"} />
          Your browser does not support audio playback.
        </audio>
      </div>
    );
  }

  return (
    <div className="media-placeholder">
      <span>{asset.mediaType.toUpperCase()}</span>
    </div>
  );
}
