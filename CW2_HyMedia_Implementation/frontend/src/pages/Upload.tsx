import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ErrorBanner from "../components/ErrorBanner";
import { createAsset } from "../services/assetService";
import type { MediaType, Visibility } from "../types/asset";

export default function Upload() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [mimeType, setMimeType] = useState("image/jpeg");
  const [fileName, setFileName] = useState("demo-file.jpg");
  const [blobUrl, setBlobUrl] = useState("https://placehold.co/900x600?text=HyMedia+Upload");
  const [hashtags, setHashtags] = useState("#demo,#hymedia");
  const [taggedUsers, setTaggedUsers] = useState("@demo_creator");
  const [locationName, setLocationName] = useState("London, UK");
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [isSensitive, setIsSensitive] = useState(false);
  const [isAdult18Plus, setIsAdult18Plus] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      const response = await createAsset({
        title,
        caption,
        description,
        mediaType,
        mimeType,
        fileName,
        blobUrl,
        hashtags,
        taggedUsers,
        locationName,
        visibility,
        ownerId: "demo_user",
        isSensitive,
        isAdult18Plus,
        allowComments
      });

      navigate("/assets/" + response.data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create HyMedia post.");
    } finally {
      setSaving(false);
    }
  }

  function handleMediaTypeChange(value: MediaType) {
    setMediaType(value);

    if (value === "image") {
      setMimeType("image/jpeg");
      setFileName("demo-image.jpg");
      setBlobUrl("https://placehold.co/900x600?text=HyMedia+Image");
    }

    if (value === "video") {
      setMimeType("video/mp4");
      setFileName("demo-video.mp4");
      setBlobUrl("");
    }

    if (value === "audio") {
      setMimeType("audio/mpeg");
      setFileName("demo-audio.mp3");
      setBlobUrl("");
    }

    if (value === "gif") {
      setMimeType("image/gif");
      setFileName("demo-animation.gif");
      setBlobUrl("https://placehold.co/900x600?text=HyMedia+GIF");
    }
  }

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <h2>Create HyMedia Post</h2>
          <p>
            This form mirrors the CW1 upload screen: caption, hashtags, tagged users,
            location, privacy, sensitive-content controls and comment settings.
          </p>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      <form className="form-panel" onSubmit={handleSubmit}>
        <label>
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Example: London Food Clip"
            required
          />
        </label>

        <label>
          Caption
          <input
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="Short feed caption..."
          />
        </label>

        <label>
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Longer optional description..."
            rows={3}
          />
        </label>

        <div className="form-row">
          <label>
            Media Type
            <select
              value={mediaType}
              onChange={(event) => handleMediaTypeChange(event.target.value as MediaType)}
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="gif">GIF</option>
            </select>
          </label>

          <label>
            Privacy
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as Visibility)}
            >
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE_SELECTED">Private to Selected</option>
              <option value="UNLISTED_LINK">Unlisted Link</option>
              <option value="CREATOR_PREMIUM">Creator Premium</option>
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>
            Hashtags
            <input value={hashtags} onChange={(event) => setHashtags(event.target.value)} />
          </label>

          <label>
            Tagged Users
            <input value={taggedUsers} onChange={(event) => setTaggedUsers(event.target.value)} />
          </label>
        </div>

        <label>
          Location
          <input value={locationName} onChange={(event) => setLocationName(event.target.value)} />
        </label>

        <div className="form-row">
          <label>
            MIME Type
            <input value={mimeType} onChange={(event) => setMimeType(event.target.value)} />
          </label>

          <label>
            File Name
            <input value={fileName} onChange={(event) => setFileName(event.target.value)} />
          </label>
        </div>

        <label>
          Blob URL / Placeholder URL
          <input
            value={blobUrl}
            onChange={(event) => setBlobUrl(event.target.value)}
            placeholder="Will be generated by Azure Blob Storage in the next stage"
          />
        </label>

        <div className="toggle-grid">
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={isSensitive}
              onChange={(event) => setIsSensitive(event.target.checked)}
            />
            Sensitive content
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={isAdult18Plus}
              onChange={(event) => setIsAdult18Plus(event.target.checked)}
            />
            18+ content
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={allowComments}
              onChange={(event) => setAllowComments(event.target.checked)}
            />
            Allow comments
          </label>
        </div>

        <button className="button button-primary" disabled={saving} type="submit">
          {saving ? "Creating..." : "Create HyMedia Post"}
        </button>
      </form>
    </section>
  );
}
