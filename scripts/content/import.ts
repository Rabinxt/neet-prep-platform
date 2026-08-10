import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { importContentBundle } from "../../src/server/content/import-service";
import { getDatabaseUrl } from "../../src/server/db/env";
import { loadAndValidateContent } from "./load-content";

const { bundle, errors } = loadAndValidateContent();

if (errors.length > 0) {
  console.error(`Content import stopped because validation found ${errors.length} error(s):`);
  for (const error of errors) {
    console.error(`- ${error.file} [${error.identifier}]: ${error.reason}`);
  }
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
const prisma = new PrismaClient({ adapter });

try {
  await importContentBundle(prisma, bundle, { cleanupLegacyFixtures: true });
  console.info(
    `Imported ${bundle.subjects.length} subjects, ${bundle.chapters.length} chapters, ${bundle.topics.length} topics, and ${bundle.questions.length} questions.`,
  );
} catch {
  console.error("Content import failed. No connection details were printed.");
  console.error("The transaction was rolled back. Check database connectivity, applied migrations, and content constraints.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
