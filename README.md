# NEET Prep

A production-oriented NEET preparation platform built with Next.js, TypeScript, Tailwind CSS, PostgreSQL, and Prisma ORM.

The platform includes a real academic hierarchy (`Subject -> Chapter -> Topic -> Question`), a validated JSON content importer, a safe question bank, persistent Practice and Exam Modes, Better Auth accounts, student analytics, and server-authorized administration.

## Requirements

- Node.js 22 or a compatible current LTS release
- npm
- PostgreSQL 14 or newer, local or managed

## Environment

Create a local `.env` from the committed template:

```powershell
Copy-Item .env.example .env
```

Set all three required values:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@POOLED_HOST/DATABASE?sslmode=require"
BETTER_AUTH_SECRET="replace-with-at-least-32-random-characters"
BETTER_AUTH_URL="http://localhost:3000"
```

`DATABASE_URL` is server-only. For Neon on Vercel, use Neon&apos;s pooled application URL where supported; local PostgreSQL commonly omits `sslmode=require`. `BETTER_AUTH_SECRET` must be unique, high entropy, and at least 32 characters. `BETTER_AUTH_URL` must be an origin only: localhost for local work and the canonical HTTPS origin in Production.

Secret-bearing `.env` files are ignored by Git. Only `.env.example`, which contains placeholders, is committed. Never prefix these values with `NEXT_PUBLIC_`.

## Creating PostgreSQL

For a local database, install PostgreSQL, start its service, and create an empty database with pgAdmin or:

```powershell
createdb -U postgres neet_prep
```

For managed PostgreSQL, create an empty database and place its application connection string in `.env`. For deployment, choose a region near the application and use a serverless-compatible pooled connection when the provider recommends one.

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

The committed development bank contains 36 clearly labelled `SAMPLE` or `ORIGINAL` questions, balanced across Physics, Chemistry, and Biology. It proves the workflow; it is not a complete syllabus or an official PYQ archive.

## Administration

Every `/admin` page and mutation verifies the authenticated role on the server. The UI supports question search, filters, pagination, transactional create/edit, publication controls, safe deletion, conservative hierarchy management, and bounded pasted-JSON imports with preview and explicit confirmation.

Accounts always register as `STUDENT`; there is no public role chooser. Promote a known existing account only from the trusted server/workspace command line:

```powershell
npm run admin:promote -- student@example.com CONFIRM_ADMIN_PROMOTION
```

The command requires the exact confirmation token, promotes only that email, revokes its existing sessions, and never prints database credentials. The user must sign in again before the ADMIN role is active.

Admin imports accept a single JSON object containing `subjects`, `chapters`, `topics`, and `questions` arrays using the same field structure as `data/neet`. Imports are limited to 500 KB and 200 questions, revalidated at confirmation, transactionally applied, and idempotent by question `importId`.

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

Anonymous ownership uses a cryptographically random token stored only in an HTTP-only, SameSite=Lax cookie (Secure on HTTPS). PostgreSQL stores its SHA-256 hash in `AnonymousSession`; raw ownership tokens never appear in URLs, local storage, logs, or attempt rows. Every attempt read and write checks the current anonymous session. Sign-in and sign-up claim matching anonymous attempts transactionally and clear their anonymous ownership.

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
- `/dashboard`: authenticated student history and analytics
- `/admin`: ADMIN-only content overview
- `/admin/questions`, `/admin/questions/new`, `/admin/questions/[id]/edit`: question management
- `/admin/subjects`, `/admin/chapters`, `/admin/topics`: conservative hierarchy management
- `/admin/import`: bounded JSON validation, preview, and transactional import
- `/api/health`: cache-disabled, credential-free liveness response

## Safe migration and release process

Use `npm run db:migrate` only while developing a migration against a disposable/local development database. Review the generated SQL and commit the migration. Never use `prisma migrate reset` for Preview or Production.

For a release:

1. Confirm the target database and its recovery/backup capability in Neon before any schema-sensitive change.
2. Apply committed migrations to a separate Preview database with `npm run db:migrate:deploy`.
3. Run the regression suites and smoke-test the Preview deployment.
4. Confirm Production recovery readiness, then run `npm run db:migrate:deploy` against the intended Production database.
5. Deploy the application only after migrations succeed, then complete the smoke checklist below.

The seed and content importer are not part of the automatic build. `db:seed` only upserts the three core subjects; `content:import` upserts managed content transactionally. Neither command should be run against Production casually.

## Vercel and Neon checklist

- Create separate Vercel Development, Preview, and Production values for `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`.
- Keep Preview off the Production Neon database unless sharing production data is an explicit, reviewed decision. Prefer a separate branch/database and separate auth secret.
- Set Production `BETTER_AUTH_URL` to the canonical HTTPS origin, never localhost.
- Use one stable Preview origin for auth testing, with its exact origin in Preview `BETTER_AUTH_URL`. Arbitrary per-commit preview hosts are intentionally not wildcard-trusted.
- Keep Production and Preview database URLs scoped to the correct Neon database/branch and use a pooled application URL where appropriate.
- Apply migrations with `npm run db:migrate:deploy`; do not run interactive development migration commands in deployment.
- Environment changes affect only new Vercel deployments, so redeploy after every environment-variable change.
- When attaching a custom domain, update `BETTER_AUTH_URL` to that canonical origin, confirm metadata/robots URLs, update Vercel&apos;s production domain, and redeploy.
- Do not put database migrations, seeds, or content imports into the application build command.

## Post-deployment smoke checklist

- Public: home, subjects, question bank, anonymous Practice, anonymous Mock, results/review, robots, sitemap, and `/api/health`.
- Auth: sign-up, sign-in, sign-out, session refresh/persistence, dashboard redirect, and anonymous-attempt claim.
- Authenticated study: Practice/Mock start, answer save, refresh/resume, expiry, results, and dashboard analytics.
- Admin: ADMIN sign-in, overview, filters, create draft, publish/unpublish, hierarchy validation, import preview, and confirmed import.
- Isolation: anonymous cannot open dashboard/admin; STUDENT cannot open admin; one account/browser cannot open another owner&apos;s attempt or analytics.
- Mobile at roughly 390 px and 768 px: navigation, forms, Practice, Mock controls/timer, results, dashboard, and admin tables/forms without horizontal page overflow.
- HTTPS: cookies are HttpOnly, SameSite=Lax, Secure; no tokens or ownership identifiers appear in URLs or client storage.

## Known limitations

- No email verification, password-reset email, social login, or email provider.
- Better Auth&apos;s built-in abuse protection applies, but there is no custom distributed rate-limit service. A serverless-safe external limiter is a future enhancement if abuse warrants it.
- No external observability platform, payments, subscriptions, AI features, leaderboard, or tracking analytics.
- Dashboard analytics are computed on demand from owned attempt snapshots.
- The 36 committed questions are SAMPLE/ORIGINAL development content, not a complete or officially verified/licensed PYQ corpus.
- Database recovery is provider-operated; confirm the Neon plan&apos;s current recovery features before a sensitive migration.
- The current PostgreSQL driver warns that SSL-mode semantics will change in its next major release; review Neon&apos;s then-current connection-string guidance before upgrading to `pg` 9.

## Quality checks

```powershell
npx prisma format
npm run db:validate
npm run db:generate
npm run content:validate
npm run test:attempts
npm run test:attempts:integration
npm run test:auth
npm run test:analytics
npm run test:analytics:integration
npm run test:admin
npm run test:security
npm run check:repo
npm run check:client-secrets
npm run lint
npx tsc --noEmit
npm run build
git diff --check
```
