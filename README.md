# Invoice Studio

Secure, multi-brand invoice generator. Sign-in is required before any invoice can be
created, viewed or downloaded.

## Two editions

- **Full web app** (this repository, below): accounts and passwords, per-user data
  isolation, admin users, shared database. Needs Node.js 20+.
- **Simple offline edition** (`simple-offline/`): a single HTML file you double-click.
  No install, no Node.js, no server, no login — data lives in that browser's local
  storage on that one computer, with JSON backup/restore. Meant for one person
  invoicing from one machine; see `simple-offline/README.txt`.

## Item catalogue

Products and services are saved once under **Items** with an optional code (unique per
account), name, unit, rate, tax rate and HSN/SAC. On an invoice, typing a code or name in
"Pick a saved item" fills the line in, and "Save as item" turns a hand-typed line into a
catalogue entry. Invoice lines keep their own copy of the code, description and rate, so
editing or deleting a catalogue item never rewrites invoices already issued.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS
- Prisma ORM + SQLite (swappable for Postgres/MySQL)
- Database-backed sessions with bcrypt password hashing
- `@react-pdf/renderer` for A4 PDF export

## Getting started (no terminal needed)

Install Node.js 20+ from [nodejs.org](https://nodejs.org), then double-click:

- **Windows:** `Start Invoice Studio.bat`
- **macOS / Linux:** `Start Invoice Studio.command` (first time on macOS: right-click → Open)

It installs everything, starts the app and opens the browser. The first screen asks for
your name, business name, email and password and creates your owner account — no files
to edit. After that, sign in at http://localhost:3000.

## Getting started (terminal)

```bash
npm run app     # setup + build + start + open browser (same as double-clicking)
# or, for development:
npm run setup
npm run dev
```

Setup writes a git-ignored `.env` with a random `SESSION_SECRET`; if `.env`
already exists it is left untouched. To do it manually instead:

```bash
cp .env.example .env      # then edit the values
npm install
npm run db:migrate
npm run db:seed
```

## Environment variables

| Variable         | Purpose                                              |
| ---------------- | ---------------------------------------------------- |
| `DATABASE_URL`   | Prisma connection string (default: local SQLite file) |
| `SESSION_SECRET` | Secret used for session handling (any long random string) |
| `ADMIN_EMAIL`    | Optional: pre-create the administrator instead of using the setup screen |
| `ADMIN_PASSWORD` | Optional: administrator password (min 8 chars)        |
| `ADMIN_NAME`     | Optional: administrator display name                  |

If `ADMIN_EMAIL`/`ADMIN_PASSWORD` are unset, the first visit shows a `/setup` screen that
creates the owner account in the browser. Administrator credentials are only ever read
from the environment; they are never committed to source or exposed to the browser.

## Scripts

| Script               | Description                        |
| -------------------- | ---------------------------------- |
| `npm run setup`      | One-command first-time setup       |
| `npm run app`        | Setup, build, start and open the browser |
| `npm run dev`        | Start the dev server               |
| `npm run build`      | Production build                   |
| `npm run lint`       | ESLint                             |
| `npm run typecheck`  | TypeScript, no emit                |
| `npm run db:migrate` | Apply migrations in development    |
| `npm run db:deploy`  | Apply migrations in production     |
| `npm run db:seed`    | Seed administrator + sample brand (skipped if admin env vars are unset) |

## Security model

- Passwords are hashed with bcrypt (cost 12); plain text is never stored.
- Sessions are random 256-bit tokens, stored only as SHA-256 hashes, in httpOnly cookies.
- Every query is scoped by `userId`, so one account can never read another's data.
- Mutating API routes require a double-submit CSRF token.
- Uploads are validated by type, size and re-encoded filename before storage.
