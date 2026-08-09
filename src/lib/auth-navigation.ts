export function safeCallbackUrl(value: string | null | undefined) {
  if (
    !value
    || !value.startsWith("/")
    || value.startsWith("//")
    || value.includes("\\")
    || /%5c/i.test(value)
  ) return "/dashboard";

  try {
    const parsed = new URL(value, "https://neet-prep.local");
    if (parsed.origin !== "https://neet-prep.local") return "/dashboard";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/dashboard";
  }
}
