import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseUrl = process.env.DATABASE_URL?.trim();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Keeping this optional allows schema validation and client generation before
  // a developer has provisioned PostgreSQL. Migration and seed commands still
  // require DATABASE_URL.
  datasource: databaseUrl ? { url: databaseUrl } : undefined,
});
