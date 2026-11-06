# LifeOS

A private Turkish productivity workspace for Windows and the web. No billing, analytics, paid AI API, public registration, or seeded activity.

**Status: working local productivity build; not yet approved for daily Windows reminder reliance.** Web/UI builds and local automated checks run in this repository. Windows CI passes Rust checking, six native unit tests and NSIS packaging. The installer was installed and launched locally. Actual reminder delivery/recovery, live Supabase email authentication, and two-device cloud sync still require the gates in [delivery status](docs/DELIVERY.md). Do not infer native reliability from browser tests.

## Run

Requires Node.js 24 and pnpm 11.25.0. In PowerShell, from the repository root:

```powershell
npm install -g pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://127.0.0.1:3000`. No credentials are needed for local use. Web data lives in this browser's IndexedDB, scoped to its origin. Keep using the same hostname and port. Clearing browser data removes that local copy; export JSON backups.

```powershell
pnpm dev:desktop  # Vite frontend only, http://localhost:1420
pnpm desktop     # Real Tauri app; requires Rust/MSVC/WebView2
pnpm build       # Next.js + desktop frontend production builds
pnpm --filter @lifeos/desktop tauri build  # Native Windows NSIS installer
pnpm test
pnpm typecheck
pnpm lint
pnpm test:e2e
```

The Vite browser preview uses IndexedDB. Only the real Tauri process uses SQLite and native notifications. `Ctrl+Shift+A` captures a task; `Ctrl+K` opens search. Global OS capture is not registered.

## Features

Tasks with editing, dates, priorities, categories, project links, search, grouping, completion/undo, bulk completion, and archive. Bounded timezone-aware recurrence produces separate occurrences with independently persisted optional alarms. Native generation rolls the 35-day window forward even with the webview hidden. Failed or uncertain native dispatches can be reviewed and explicitly retried in Settings. Day/week/month planning supports moving a task to another day by dragging; precise start times are edited in the task form. Projects include task lists, kanban, milestones, bug type/severity, and notes. Habits have persistent daily logs. Focus sessions use timestamps, survive reloads, and create persistent native reminder records. Career contacts, applications, interactions and follow-ups are editable. Notes autosave, can be pinned/archived and converted into tasks/projects. The workspace contains validated ChatGPT links and manually registered Codex references. Twelve optional stdio MCP tools share the desktop database.

Cloud access uses Supabase email/password authentication for an existing owner. Sync retains dirty records, checks versions, preserves tombstones, retries failures, and presents both conflict versions. Native auth uses Windows Credential Manager; web auth uses session storage. The cloud implementation still needs live verification.

## Architecture and files

```text
apps/
  desktop/             Vite/React + Tauri/Rust Windows shell
  web/                 Next.js App Router client
packages/
  ui/                  shared Turkish UI, tokens, feature modules
  core/                recurrence, timezones, timers, schedule calculations
  validation/          strict Zod domain schemas and backup envelopes
  database/            IndexedDB, native IPC, Node SQLite, application service
  integrations/        Supabase authentication/sync adapter and registry
services/mcp-server/   official MCP SDK, stdio, explicit tool allowlist
supabase/             canonical PostgreSQL schema and CLI configuration
tests/                domain, persistence, PostgreSQL RLS, MCP, RTL, Edge E2E
docs/                 architecture, setup, verification and limitations
.github/workflows/    frontend checks and Windows Rust/build workflow
```

The first version deliberately uses versioned typed record envelopes instead of 25 separate domain tables. Cloud ownership and relational references are enforced, but this is **not the fully normalized relational model from the master specification**. This tradeoff and migration path are documented in [DATABASE](docs/DATABASE.md).

## Configuration and verification

- [Setup, Supabase and Vercel](docs/SETUP.md)
- [Architecture](docs/ARCHITECTURE.md), [database](docs/DATABASE.md), [sync](docs/SYNC_ENGINE.md)
- [Reminder engine and Windows acceptance checklist](docs/REMINDER_ENGINE.md)
- [MCP connection guide](docs/MCP_INTEGRATION.md)
- [Security and threat model](docs/SECURITY.md)
- [Completed / pending delivery gates](docs/DELIVERY.md)
- [Product scope and roadmap](docs/PRD.md), [ROADMAP](docs/ROADMAP.md)

Source is stored in the private GitHub repository https://github.com/eFurkanSngl/LifeOS. No production deployment has been performed. No open-source license is granted; licensing remains undecided.

Live configuration: [cloud checkpoint](docs/CLOUD_VERIFICATION.md).
