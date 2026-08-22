# Invoice Studio

Secure, multi-brand invoice generator. Sign-in is required before any invoice can be
created, viewed or downloaded.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS
- Prisma ORM + SQLite (swappable for Postgres/MySQL)
- Database-backed sessions with bcrypt password hashing
- `@react-pdf/renderer` for A4 PDF export

## Getting started

```bash
npm install
cp .env.example .env      # then edit the values
npm run db:migrate        # create the database
npm run db:seed           # create the administrator + sample brand
npm run dev
```

The app runs at http://localhost:3000 and redirects to `/login`.

## Environment variables

| Variable         | Purpose                                              |
| ---------------- | ---------------------------------------------------- |
| `DATABASE_URL`   | Prisma connection string (default: local SQLite file) |
| `ADMIN_EMAIL`    | Email of the seeded administrator                     |
| `ADMIN_PASSWORD` | Password of the seeded administrator (min 8 chars)    |
| `ADMIN_NAME`     | Display name of the seeded administrator              |

Administrator credentials are only ever read from the environment; they are never
committed to source or exposed to the browser.

## Scripts

| Script               | Description                        |
| -------------------- | ---------------------------------- |
| `npm run dev`        | Start the dev server               |
| `npm run build`      | Production build                   |
| `npm run lint`       | ESLint                             |
| `npm run typecheck`  | TypeScript, no emit                |
| `npm run db:migrate` | Apply migrations in development    |
| `npm run db:deploy`  | Apply migrations in production     |
| `npm run db:seed`    | Seed administrator + sample brand  |

## Security model

- Passwords are hashed with bcrypt (cost 12); plain text is never stored.
- Sessions are random 256-bit tokens, stored only as SHA-256 hashes, in httpOnly cookies.
- Every query is scoped by `userId`, so one account can never read another's data.
- Mutating API routes require a double-submit CSRF token.
- Uploads are validated by type, size and re-encoded filename before storage.
