# NEET Prep

A production-oriented NEET preparation platform built with Next.js, TypeScript, Tailwind CSS, PostgreSQL, and Prisma ORM.

The current implementation includes the public UI foundation, the academic content hierarchy (`Subject → Chapter → Topic`), a development question bank with safe server-side answer checking, and an in-memory Practice Mode. Authentication, persistent practice sessions, and mock-test attempts are intentionally not implemented yet.

## Requirements

- Node.js 22 or a compatible current LTS release
- npm
- PostgreSQL 14 or newer, either local or managed

## Database environment

The application currently requires one database variable:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
```

Copy the committed template to a local `.env` file:

```powershell
Copy-Item .env.example .env
```

Then replace the placeholder value. `.env` and all other secret-bearing environment files are ignored by Git. Only `.env.example`, which contains no credentials, is committed.

For local PostgreSQL, a typical URL is:

```dotenv
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/neet_prep"
```

Local PostgreSQL normally does not require `sslmode=require`. Hosted providers commonly do; use the exact connection string supplied by your provider.

## Creating PostgreSQL

Choose either approach—no specific provider is required.

### Local PostgreSQL

1. Install PostgreSQL and ensure its service is running.
2. Create an empty database using pgAdmin, or run:

   ```powershell
   createdb -U postgres neet_prep
   ```

3. Put the local connection URL in `.env`.

### Managed PostgreSQL

1. Create an empty PostgreSQL database with any managed provider.
2. Keep the database in the same or nearest practical region as the future Vercel deployment.
3. Copy its PostgreSQL connection string into `.env` as `DATABASE_URL`.
4. Use a pooled application URL if the provider recommends one for serverless traffic. Confirm that the same URL supports Prisma migrations; some providers supply a separate direct URL, which can be introduced when deployment is configured.

## Initial database setup

After `DATABASE_URL` points to a reachable empty database:

```powershell
npm run db:validate
npm run db:generate
npx prisma migrate dev
npm run db:seed
npm run db:health
```

The seed is idempotent. It creates or updates Physics, Chemistry, and Biology plus one clearly labelled development chapter, one development topic, and three `SAMPLE` questions for each subject. The sample questions are not represented as official NEET PYQs.

## Development

```powershell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database commands

| Command | Purpose |
| --- | --- |
| `npm run db:validate` | Validate the Prisma schema without connecting to PostgreSQL |
| `npm run db:generate` | Generate the typed Prisma Client |
| `npx prisma migrate dev --name <name>` | Create and apply a development migration |
| `npm run db:migrate:deploy` | Apply committed migrations in production |
| `npm run db:seed` | Seed core subjects and the small development question bank |
| `npm run db:health` | Verify connectivity without exposing connection details |

Client generation runs automatically after `npm install`. Schema validation and generation work without `DATABASE_URL`; migrations, seeding, health checks, and database-backed reads require a configured connection.

When PostgreSQL is not configured or is temporarily unavailable, the public pages display the three core subjects from a small fallback catalogue. This keeps local builds functional, but it is not a replacement for applying the migration and seed in a deployed environment.

## Development question bank

Open [http://localhost:3000/questions](http://localhost:3000/questions) to filter published questions by subject and difficulty. The initial page payload contains option IDs, labels, and text, but not correct-answer flags or explanations. The server checks the selected option and returns the result and explanation only after the student chooses **Check answer**.

## Practice Mode

Open [http://localhost:3000/practice](http://localhost:3000/practice) to build an untimed practice set by subject, chapter, topic, difficulty, and question count. Responses, checked answers, and the completion summary exist only in browser memory and are cleared when the page is closed or a new setup is started.

## Quality checks

```powershell
npm run lint
npm run build
```
