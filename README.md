# NestJS Taskboard

A meaningful **NestJS** application for the xCloud app-compatibility suite: a
project/task board served by **NestJS 12** on Express, with **SQLite**
persistence through **TypeORM** and the `better-sqlite3` driver.

It is a production-process fixture, not a success-page shell: every workflow
reads and writes through TypeORM repositories backed by a real SQLite file,
all input is validated server-side with meaningful error payloads, and
`scripts/verify.sh` exercises the real production process end to end.

## Feature summary

- **NestJS** modules/controllers/providers DI wiring: `AppModule` imports the
  `ConfigModule`, `DatabaseModule`, `SeedModule`, `HealthModule`, `MetaModule`,
  `ProjectsModule` and `TasksModule` (`app.module.ts`).
- Projects and tasks with status/priority, search (`q`), and status/priority
  filters — served over a JSON API (`/api/projects`, `/api/tasks`) consumed by
  a small DOM-rendered client.
- Validated CRUD with a global `ValidationPipe` + `class-validator`/`class-transformer`
  DTOs: blank/over-long/mistyped fields, invalid status/priority, malformed
  JSON, missing references and not-found resources all return meaningful JSON
  errors (400/404).
- Parameterized TypeORM query builder everywhere; LIKE wildcards (`%`, `_`,
  `\`) are escaped so user input can never broaden a search.
- Idempotent TypeORM `synchronize` schema and one-time seed data guarded by a
  `seed_flag` table, so re-opens never duplicate rows.
- Persistence: explicit SQLite file (`DATA_DIR`/`DATABASE_PATH`); the app
  never stores permanent state in an ephemeral release directory.
- `/api/health/live` (process alive) and `/api/health/ready` (real SQL query —
  **503** while the database is unavailable, process stays alive so liveness
  keeps serving).
- Non-sensitive release marker: `scripts/build.sh` writes a generated
  `VERSION` file (git SHA by default — `BUILD_MARKER` to override); the marker
  is served by `/api/meta` and shown in the UI footer. `VERSION` is a **build
  artifact** (gitignored).
- Graceful SIGTERM/SIGINT shutdown (Nest shutdown hooks close the TypeORM
  `DataSource`), logs to stdout/stderr.

## Runtime and dependencies

- Node.js **v22.23.2** validated (Node >= 20 supported).
- NestJS 12 (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`),
  TypeORM 1.1.1 + `better-sqlite3` for SQLite persistence.
- Tests via **Vitest** (globals) + `@nestjs/testing`/`supertest`; production
  compile via `@nestjs/cli` (`nest build`) to CommonJS.
- Lockfile `package-lock.json` pins the toolchain; `npm ci` reproduces it.

Runtime versions (this verification):

| Component | Version |
|-----------|---------|
| Node.js   | 22.23.2 |
| @nestjs/core | 12.0.3 |
| TypeORM    | 1.1.1 |
| better-sqlite3 | 12.11.1 |
| Vitest     | 4.1.11 |

## Quick start (development)

```bash
npm install
cp .env.example .env       # review and adjust
npm run dev                # nest start --watch
```

Open http://localhost:8080 — the seeder has already created two demo projects
and several tasks on first boot.

## Production start

```bash
npm ci
npm run build              # scripts/build.sh: writes VERSION, nest build -> dist
npm start                  # node dist/main
```

- Binds to `BIND_HOST:PORT` (defaults **0.0.0.0:8080**).
- Run from the repository root so `./public` (UI assets) and `VERSION`
  resolve correctly.
- Logs go to stdout/stderr; the process answers SIGTERM/SIGINT with a clean
  shutdown.

## Health and readiness

| Endpoint | Meaning |
|----------|---------|
| `GET /api/health/live`  | Process is alive (always 200 while serving). |
| `GET /api/health/ready` | Runs a real SQL probe against the SQLite file; **503** when the database is unavailable, with a `status: "unavailable"` body and the underlying reason. |

`scripts/smoke.sh` proves the degraded path: it starts the production process
against a database path that cannot be created (parent is a regular file),
observes readiness drop to 503 while liveness stays 200, then restores a
healthy process and proves readiness recovers.

## Environment variables

See `.env.example` for the full commented list.

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `PORT` | no | `8080` | bind port |
| `BIND_HOST` | no | `0.0.0.0` | bind address |
| `DATA_DIR` | no | `<repo>/data` | base data directory |
| `DATABASE_PATH` | no | `<DATA_DIR>/taskboard.db` | **persistent SQLite path** |
| `BUILD_MARKER` | no | git SHA | release marker in `/api/meta` and the UI footer |

No credentials or secrets are committed or required.

## Persistence

Data lives in the SQLite file at `DATABASE_PATH`, which defaults under
`DATA_DIR` (gitignored). For redeploys that reuse or replace the release
directory, mount a persistent volume at `DATA_DIR`/`DATABASE_PATH` so the
file survives. `scripts/smoke.sh` proves persistence: it creates a
"PERSIST" survivor task over HTTP, gracefully stops the production process,
restarts it on the **same database path**, and verifies the record is still
served with stable counts.

## Schema

Synchronized by TypeORM (`synchronize: true`, idempotent):

- `project` — id, name, description, status (`active|archived`), timestamps.
- `task` — id, `projectId` FK (`ON DELETE CASCADE`), title, description,
  status (`todo|in_progress|done`), priority (`low|medium|high`), timestamps.
- `seed_flag` — marks the one-time seed as applied.

Seeding is repeatable: the second and subsequent boots never add rows
(`test/app.e2e-spec.ts` asserts seed idempotency).

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health/live` | liveness |
| GET | `/api/health/ready` | readiness (DB probe) |
| GET | `/api/meta` | release marker + runtime versions |
| GET/POST | `/api/projects` | list / create projects |
| GET/PATCH/DELETE | `/api/projects/:id` | read / update / delete a project |
| GET/POST | `/api/tasks` | list (filters `q`, `status`, `priority`, `project_id`) / create tasks |
| GET/PATCH/DELETE | `/api/tasks/:id` | read / update / delete a task |

The UI at `/` consumes the same JSON API.

## Automated verification

```bash
scripts/verify.sh
```

Runs, in order:

1. Clean install — `rm -rf node_modules && npm ci` (frozen lockfile).
2. `scripts/build.sh` — writes the `VERSION` release marker and compiles
   `dist/` via `nest build`.
3. Strict typecheck — `tsc --noEmit`.
4. Vitest e2e suite — `test/app.e2e-spec.ts` against `@nestjs/testing` +
   `supertest`: CRUD, search/filter, validation negatives (blank/over-long/
   mistyped fields, invalid status/priority, malformed JSON, missing project,
   404s), LIKE-wildcard escaping, seed/schema idempotency, restart-style
   persistence, and readiness that genuinely drops to 503 when the database is
   unavailable.
5. `scripts/smoke.sh` — real production process (`node dist/main`):
   liveness/readiness, CRUD over HTTP, search/status filters, release marker,
   negative cases, graceful stop → restart persistence, database-unavailable
   readiness (503) and recovery.

Exit 0 only when every check passes.

## Repository layout

```
src/            app.module.ts, app.configure.ts (shared bootstrap wiring),
                config.ts + config/, database/, health/, meta/, projects/,
                seed/, tasks/
test/           app.e2e-spec.ts (Vitest + @nestjs/testing + supertest)
scripts/        build.sh (VERSION + nest build), smoke.sh (production check),
                verify.sh (full verification)
public/         DOM-rendered UI (index.html, app.js, style.css)
package.json    scripts + dependencies
vitest.config.* vitest configuration (.mts)
package-lock.json
```

## License

MIT — see [LICENSE](LICENSE). This fixture is part of the MIT-licensed
[xCloud app-compatibility suite](https://github.com/xCloudNobin/app-compatibility).