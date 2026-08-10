const FALLBACK_SITE_URL = "http://localhost:3000";

export function getSiteUrl() {
  const configured = process.env.BETTER_AUTH_URL?.trim();
  if (!configured) return new URL(FALLBACK_SITE_URL);

  try {
    return new URL(new URL(configured).origin);
  } catch {
    return new URL(FALLBACK_SITE_URL);
  }
}
