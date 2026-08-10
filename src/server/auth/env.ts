import "dotenv/config";

const MINIMUM_SECRET_LENGTH = 32;
const EXAMPLE_SECRET = "replace-with-at-least-32-random-characters";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function required(name: "BETTER_AUTH_SECRET" | "BETTER_AUTH_URL") {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required. Add it to your local .env file.`);
  }
  return value;
}

export function getAuthEnvironment() {
  const secret = required("BETTER_AUTH_SECRET");
  if (secret.length < MINIMUM_SECRET_LENGTH || secret === EXAMPLE_SECRET) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
  }

  const rawUrl = required("BETTER_AUTH_URL");
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("BETTER_AUTH_URL must be a valid absolute URL.");
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error("BETTER_AUTH_URL must use http or https.");
  }

  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("BETTER_AUTH_URL must be an origin only, without credentials, a path, query, or fragment.");
  }

  const isLocalhost = LOCAL_HOSTS.has(url.hostname);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:" && !isLocalhost) {
    throw new Error("BETTER_AUTH_URL must use HTTPS outside localhost in production.");
  }

  return {
    secret,
    baseURL: url.origin,
    useSecureCookies: url.protocol === "https:",
  };
}
