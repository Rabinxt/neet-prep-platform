# NEET Prep

A production-oriented NEET preparation platform built with Next.js, TypeScript, Tailwind CSS, PostgreSQL, and Prisma ORM.

The current foundation includes a real academic hierarchy (`Subject -> Chapter -> Topic -> Question`), a validated JSON content importer, a safe question bank, and persistent anonymous Practice and Exam Modes. Authentication, analytics, and administration are intentionally deferred.

## Requirements

- Node.js 22 or a compatible current LTS release
- npm
- PostgreSQL 14 or newer, local or managed

## Database environment

Create a local `.env` from the committed template:

```powershell
Copy-Item .env.example .env
```

Set the single required secret:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
```

Secret-bearing `.env` files are ignored by Git. Only `.env.example`, which contains no credentials, is committed. Local PostgreSQL commonly omits `sslmode=require`; managed providers may require it. Use the connection string supplied by your provider.

## Creating PostgreSQL

For a local database, install PostgreSQL, start its service, and create an empty database with pgAdmin or:

```powershell
createdb -U postgres neet_prep
```

For managed PostgreSQL, create an empty database with any provider and place its application connection string in `.env`. For deployment, choose a region near the application and use a serverless-compatible pooled connection when the provider recommends one.

## Initial setup

```powershell
npm install
npm run db:validate
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
npm run content:validate
npm run content:import
npm run db:health
npm run dev
```

`db:seed` now seeds only the three core subjects. Academic taxonomy and questions are owned by the content files and imported separately.

## Content data structure

Developer-managed NEET content lives under `data/neet`:

```text
data/neet/
  subjects.json
  chapters.json
  topics.json
  questions/
    physics.json
    chemistry.json
    biology.json
```

- `subjects.json` defines stable subject IDs such as `physics`.
- `chapters.json` references `subjectId` and provides a stable, scoped slug.
- `topics.json` references `chapterId` and provides a stable, scoped slug.
- Each question file contains stable question IDs, hierarchy references, four options, the correct flag, explanation, difficulty, source, marks, order, and publication state.

Identifiers use lowercase kebab-case. A question may set `topicId` to `null`, but it must always reference a valid subject and chapter. The optional `legacyId` field exists only to move the original development fixtures into the imported hierarchy without duplicating them; do not add it to new content.

## Content workflow

1. Add or edit the taxonomy and question JSON files.
2. Validate everything before touching PostgreSQL:

   ```powershell
   npm run content:validate
   ```

3. Import the validated bundle in one database transaction:

   ```powershell
   npm run content:import
   ```

4. Verify the content in `/subjects`, `/questions`, `/practice`, and `/mock-tests`.

The importer upserts subjects by stable slug, chapters and topics by parent-scoped slug, and questions by the unique `importId`. Re-running it updates managed records and replaces their four options; it does not create duplicates or delete unrelated content. Validation always runs before the transaction, and any database failure rolls the import back.

## Validation rules

Validation rejects malformed JSON and content with:

- missing or duplicate identifiers
- non-kebab-case IDs or slugs
- duplicate subject order, chapter slug/order, or topic slug/order in the same parent
- missing subjects or chapters, invalid topics, or inconsistent hierarchy references
- missing question text or explanation fields with invalid values
- anything other than exactly four options labelled uniquely A through D
- no correct option or multiple correct options
- invalid difficulty (`EASY`, `MEDIUM`, `HARD`)
- invalid source type (`SAMPLE`, `ORIGINAL`, `PYQ`)
- a PYQ without a valid NEET year from 2013 through the current year
- an exam year on non-PYQ content
- invalid positive marks, negative marks, order, or publication state

Errors include the source file, content identifier, and reason. Database credentials are never printed.

## Source quality rules

- `SAMPLE`: development or demonstration content. It must never be presented as an official previous-year question.
- `ORIGINAL`: reviewed, original preparation content created for this platform.
- `PYQ`: a verified previous-year NEET question. It requires the real exam year; never guess or fabricate one.

The committed example bank contains nine clearly labelled `SAMPLE` questions: three each for Physics, Chemistry, and Biology, spread across eight chapters and nine topics. It proves the workflow; it is not a complete syllabus or an official PYQ archive.

## Database commands

| Command | Purpose |
| --- | --- |
| `npm run db:validate` | Validate the Prisma schema without connecting to PostgreSQL |
| `npm run db:generate` | Generate the typed Prisma Client |
| `npm run db:migrate` | Create/apply a migration during local development |
| `npm run db:migrate:deploy` | Apply committed migrations without creating new ones |
| `npm run db:seed` | Upsert the three core subjects only |
| `npm run db:health` | Verify connectivity without exposing connection details |
| `npm run content:validate` | Validate the complete JSON content bundle without database writes |
| `npm run content:import` | Validate and transactionally upsert the content bundle |

When PostgreSQL is unavailable, public subject navigation uses a small three-subject fallback. Questions, practice sets, and exams still require imported database content.

## Answer safety

Public question queries return option IDs, labels, and text, but never `isCorrect` or explanations. Practice answers are checked on the server after the selection is persisted. Active exam payloads are projected from immutable snapshots without correctness or explanations. Final scoring loads the owned attempt on the server; the client never submits marks, correctness, timing, or question metadata.

## Anonymous attempt persistence

Starting Practice or Exam Mode creates an `Attempt` with immutable `AttemptQuestion` and `AttemptQuestionOption` snapshots. Historical results therefore remain stable if the source question, options, hierarchy, explanation, or marking scheme changes later.

Anonymous ownership uses a cryptographically random token stored only in a secure, HTTP-only, same-site cookie. PostgreSQL stores its SHA-256 hash in `AnonymousSession`; raw ownership tokens never appear in URLs, local storage, logs, or attempt rows. Every attempt read and write checks the current anonymous session. A later authentication migration can add nullable user ownership and attach existing anonymous attempts without redesigning the snapshot models.

Practice selections, checked results, and current position are restored after refresh. Exam question order, saved answers, review statuses, and current position are also restored. Exam expiry is defined by the server's `expiresAt`; the browser only displays a countdown derived from that timestamp. Every write and submission rechecks expiry, and completed/expired submissions are idempotent.

## Current routes

- `/subjects` and `/subjects/[slug]`: real taxonomy and published-content counts
- `/questions`: subject, chapter, topic, difficulty, and PYQ-year filtering
- `/practice`: persistent untimed practice builder with resume support
- `/practice/attempt/[attemptId]`: owned active practice or saved result/review
- `/mock-tests`: timed development-test setup
- `/mock-tests/attempt/[attemptId]`: owned server-timed exam, saved result, and answer review
- `/mock-tests/start`: legacy entry point that returns to mock-test setup
- `/pyq`: previous-year content entry point

## Quality checks

```powershell
npx prisma format
npm run db:validate
npm run db:generate
npm run content:validate
npm run test:attempts
npm run test:attempts:integration
npm run lint
npx tsc --noEmit
npm run build
git diff --check
```
