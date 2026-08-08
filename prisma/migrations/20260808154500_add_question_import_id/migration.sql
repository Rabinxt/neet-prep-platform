-- Stable, provider-independent identifier used by the developer content importer.
-- Nullable preserves manually created questions that are not managed by imports.
ALTER TABLE "Question" ADD COLUMN "importId" TEXT;

CREATE UNIQUE INDEX "Question_importId_key" ON "Question"("importId");
