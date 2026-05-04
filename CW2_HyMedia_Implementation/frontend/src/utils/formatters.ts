export function formatDate(value: string): string {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatTags(tags: string[]): string {
  if (!tags || tags.length === 0) {
    return "No tags";
  }

  return tags.map((tag) => "#" + tag).join(" ");
}

export function titleCase(value: string): string {
  if (!value) return "";

  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
