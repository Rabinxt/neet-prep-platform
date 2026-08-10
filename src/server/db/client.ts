import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getDatabaseUrl } from "@/server/db/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: getDatabaseUrl(),
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
    max: 5,
  });

  return new PrismaClient({ adapter });
}

export function getPrisma() {
  const prisma = globalForPrisma.prisma ?? createPrismaClient();

  // Reuse one client/pool for every invocation in a warm Node.js process.
  // Serverless instances still remain isolated from one another.
  globalForPrisma.prisma = prisma;

  return prisma;
}
