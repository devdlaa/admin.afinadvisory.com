const PROFILE_BASE_URL =
  "https://nlpbifhxscrlgsfgrlua.supabase.co/storage/v1/object/public/team_profiles";

export async function getExistingProfileImageUrl(userId) {
  if (!userId) return null;

  const url = `${PROFILE_BASE_URL}/${userId}.jpg`;

  try {
    const res = await fetch(url, { method: "HEAD" });

    if (!res.ok) return null; // 404, 401, 403 etc
    return url; // exists
  } catch {
    return null; // network error etc
  }
}

export const getProfileUrl = (userId) =>
  `https://nlpbifhxscrlgsfgrlua.supabase.co/storage/v1/object/public/team_profiles/${userId}.jpg`;

export const formatDate = (date) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const buildFallbackMessage = (changes = []) => {
  if (!changes.length) return "updated the task";

  const parts = changes.map((change) => {
    switch (change.action) {
      case "TITLE_UPDATED":
        return "updated the title";
      case "DESCRIPTION_UPDATED":
        return "updated the description";
      case "STATUS_CHANGED":
        return `changed status from ${change.from} to ${change.to}`;
      case "PRIORITY_CHANGED":
        return `changed priority`;
      case "DUE_DATE_CHANGED":
        return "updated the due date";
      case "CATEGORY_CHANGED":
        return `changed category`;
      case "ENTITY_ASSIGNED":
        return `assigned ${change.to?.name ?? "entity"}`;
      case "ENTITY_UNASSIGNED":
        return `removed ${change.from?.name ?? "entity"}`;
      default:
        return "updated the task";
    }
  });

  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;

  return `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}`;
};

export const toDateInputValue = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().split("T")[0];
};
