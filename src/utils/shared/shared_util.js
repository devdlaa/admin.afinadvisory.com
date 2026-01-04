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
