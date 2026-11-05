# LifeOS delivery checkpoint — 5 November 2026

**A functioning local productivity application has been implemented. The complete master specification is not finished and the Windows daily-use reminder gate is not passed.** Source code, local test evidence and live production verification are distinct below.

## A. Completed features and evidence

Verified in local automated tests: task capture/edit/schedule/complete/undo/reload; bounded independently tracked recurrence; timezone/DST policies; local SQLite and IndexedDB persistence; stale-write rejection; tombstones and validated backup/import; focus elapsed time and linked reminder lifecycle; task completion suppressing reminders; project task/milestone management; daily habit logs; career follow-ups and interactions; note capture/autosave/conversion and draft protection across navigation/concurrent tab edits; validated ChatGPT shortcuts and manual Codex references; settings persistence; mobile overflow; twelve MCP tools with opt-in and actual in-memory protocol calls; PostgreSQL RLS and CAS; and Supabase client sync requests against an isolated PostgreSQL test backend.

Implemented but **not native-runtime verified**: Tauri/Rust shell, SQLite-backed background scheduler, quiet hours, missed-due queries, durable duplicate claims, system tray, opt-in startup, native focus reconciliation, native toast actions, sound selection, OS-browser link opening and Windows Credential Manager auth storage. Native Rust compilation did not get past the missing system linker.

Implemented but **not live-cloud verified**: Supabase email OTP, automatic/manual sync, pending mutation retry/backoff, conflict resolution UI and native/web account synchronization. No account, deployment or live database was created or changed.

## B. Architecture

Shared React UI → validated LifeService → platform repository. Browser storage is IndexedDB. Real desktop storage is SQLite through restricted native commands. The optional Node 24 MCP process accesses the same existing database through the service layer. Rust dispatches reminders independently of React timers. Supabase uses owner-scoped RLS and a security-invoker version-checked RPC. Dirty envelopes are a persistent coalescing outbox; conflicts preserve local and remote versions.

## C. Actual repository structure

```text
apps/desktop/{src,src-tauri/{src,capabilities,icons,Cargo.toml,Cargo.lock,tauri.conf.json}}
apps/web/{app,next.config.ts,postcss.config.mjs,tsconfig.json}
packages/{ui,core,validation,database,integrations}/
packages/ui/src/features/{tasks,planner,projects,habits,career,ideas,focus,backup}.tsx
services/mcp-server/src/{index,tools}.ts
supabase/{config.toml,schema.sql,seed.sql,migrations/20261105193417_initial_lifeos.sql}
tests/{core,persistence,browser,cloud-schema,sync,mcp,components}.test.*
tests/e2e/workspace.spec.ts
docs/{PRD,ARCHITECTURE,DATABASE,DESIGN_SYSTEM,SECURITY,SYNC_ENGINE,REMINDER_ENGINE,MCP_INTEGRATION,SETUP,ROADMAP,DELIVERY}.md
.github/workflows/checks.yml
```

## D. Local commands

Requires Node 24 and pnpm 11.25.0:

```powershell
pnpm install --frozen-lockfile
pnpm dev
# http://127.0.0.1:3000
pnpm dev:desktop # browser preview only
pnpm desktop    # real native app, requires the missing C++ workload
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm test:e2e
```

Full setup is in SETUP.md. Source files are uncommitted; nothing has been pushed or deployed. No license has been selected.

## E. External configuration

- **Windows:** install the Visual Studio C++ workload, x64/x86 MSVC build tools and Windows SDK, verify WebView2, then rebuild in an appropriate developer terminal. Rust 1.99.1 is available locally under `.tools` without a system PATH modification. Cargo.lock is generated. The failed check reported `link.exe not found` before application typechecking.
- **Supabase:** create/select a dedicated project and owner, disable public and anonymous signup, apply the generated initial migration, configure email OTP delivery/template and the public project URL/publishable key in the appropriate client environment files. Never provide service-role keys to the client or paste private credentials into chat. Verify the actual RLS/advisor and cross-device flows.
- **Vercel:** follow SETUP.md for monorepo root/build settings and public environment values. Preview/production deployment has not been authorized or performed.
- **MCP:** enable the local desktop setting and register the documented stdio process with LIFEOS_MCP_ENABLED and the existing SQLite path. Manual Codex references do not imply automatic account chat discovery.

## F. Test results

| Check                                                           | Result and boundary                                                                                                                                                        |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest                                                          | **52 passed**, 7 suites: 27 core, 11 SQLite/service, 1 IndexedDB, 6 PostgreSQL schema/RLS, 4 sync protocol, 1 MCP, 2 React Testing Library                                 |
| Playwright / installed Edge                                     | **13 passed**, including recurrence, reminder reschedule, career follow-up, offline capture, persisted settings mobile layout and two-tab note-draft conflict preservation |
| TypeScript strict                                               | Passed                                                                                                                                                                     |
| ESLint                                                          | Passed; vendor downloads/build artifacts excluded                                                                                                                          |
| Next.js production build                                        | Passed on Next 16.4.5                                                                                                                                                      |
| Desktop frontend production build                               | Passed on Vite 7.3.7; this is **not** a Windows binary build                                                                                                               |
| Production dependency audit                                     | Zero reported advisories at checkpoint; see dependency-audit.json. This is not a proof of absence of vulnerabilities.                                                      |
| Rust format/parser check                                        | Passed with rustfmt                                                                                                                                                        |
| Cargo check                                                     | **Blocked/failed:** MSVC `link.exe` missing while compiling dependency build scripts                                                                                       |
| Rust unit tests, NSIS installer, real notifications/tray/resume | **Not run/passed** because native compilation is blocked                                                                                                                   |
| Live Supabase auth / RLS / two-device sync                      | **Not run**; test PostgreSQL uses isolated auth fixtures and a simulated HTTP transport                                                                                    |
| Vercel deployment / native memory benchmark                     | **Not performed**                                                                                                                                                          |

Desktop frontend output at the checkpoint is approximately 740 kB JavaScript (222 kB gzip) and 38 kB CSS (9 kB gzip). Rollup reports a large-chunk warning and harmless third-party Zod annotation warnings. There is no claim that native memory is within 60–120 MB.

Evidence images: screenshots/dashboard.png and screenshots/mobile.png. They show the genuine empty initial state, not seeded personal achievements. Test-generated contacts/tasks use isolated browser profiles and temporary databases, not the user's normal data store.

## G. Known limitations

The Windows readiness gate is open; an installer cannot be called ready based on frontend tests. Notification payload acceptance is not proof of visible delivery. Sleep/shutdown, Do Not Disturb, process termination and permissions can prevent exact-time alerts. A crash in the durable-claim/submission window can leave an uncertain event; reschedule to a new instant for explicit retry. Toast actions after a banner moves into Action Center are not guaranteed by the chosen plugin.

The database currently uses typed versioned envelopes instead of the fully normalized tables in the master specification. Complete server-side domain constraints, durable incremental sync cursors and realtime pulls remain open. Auth works through code entry rather than a deep-link browser flow; the Windows credential adapter is untested. Browser data is origin/profile-scoped; native data is account/disk protected but not app-encrypted. Initial cloud ownership is bound to one local profile. Conflict backups are downloaded JSON files and need private storage.

Recurring tasks do not yet automatically create a reminder for every future occurrence; existing occurrences are edited independently when a series changes. Habit streaks currently count consecutive calendar days rather than frequency-aware weekly targets. Prayer times can be represented by manually entered routines/blocks; no official calculation/location integration is implemented. Planner dragging moves days; precise times use forms. Markdown preview, a global OS capture shortcut, automatic Codex session discovery, a persistent workspace splitter, and complete unsaved-form protection remain open. Multi-record mutations/imports can be partially applied after a storage interruption; recovery uses version guards, tombstones, repeated import with duplicate skipping and explicit errors rather than assuming atomic distributed commits.

## H. Prioritized next actions

1. Install the missing C++ workload; run cargo check/tests and build the real Tauri installer. Fix any native compiler/platform issues that this environment could not reach.
2. Execute every installed-Windows acceptance check in REMINDER_ENGINE.md. Verify quiet hours, tray close, restart/sleep recovery, toast actions, sound, credentials, focus completion and actual memory usage.
3. Configure the dedicated Supabase owner project and run the live email/login/offline/conflict checks in SETUP.md. Run cloud security advisors and verify unrelated-user access is denied.
4. Complete recurring native reminders and uncertain-event recovery, then close the normalization/sync/security gates in ROADMAP.md before describing the full master specification as complete.
