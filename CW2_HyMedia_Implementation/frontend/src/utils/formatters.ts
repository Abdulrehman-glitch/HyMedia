export function formatDate(value: string): string {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatTags(tags: string[]): string {
  if (!tags || tags.length === 0) {
    return "No hashtags";
  }

  return tags.join(" ");
}

export function formatTaggedUsers(users: string[]): string {
  if (!users || users.length === 0) {
    return "No tagged users";
  }

  return users.join(" ");
}

export function titleCase(value: string): string {
  if (!value) return "";

  return value
    .replaceAll("_", " ")
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
