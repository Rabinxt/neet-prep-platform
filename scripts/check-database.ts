import { checkDatabaseHealth } from "../src/server/db/health";

const health = await checkDatabaseHealth();

if (health.ok) {
  console.info("Database connection is healthy.");
} else if (health.reason === "not_configured") {
  console.error("Database check failed: DATABASE_URL is not configured.");
  process.exitCode = 1;
} else {
  console.error("Database check failed: PostgreSQL is unreachable or not ready.");
  process.exitCode = 1;
}
