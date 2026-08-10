import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { getDatabaseUrl } from "../src/server/db/env";
import { coreSubjects } from "../src/server/subjects/catalog";

const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const subject of coreSubjects) {
    await prisma.subject.upsert({
      where: { slug: subject.slug },
      update: {
        name: subject.name,
        description: subject.description,
        order: subject.order,
      },
      create: subject,
    });
  }

  console.info(`Seeded ${coreSubjects.length} core subjects.`);
}

main()
  .catch(() => {
    console.error("Database seed failed. No connection details were printed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
