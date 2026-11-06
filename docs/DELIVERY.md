# LifeOS delivery checkpoint — 6 November 2026

**A functioning local productivity application has been implemented. The complete master specification is not finished and the Windows daily-use reminder gate is not passed.** Source code, local test evidence and live production verification are distinct below.

## A. Completed features and evidence

Verified in local automated tests: task capture/edit/schedule/complete/undo/reload; bounded independently tracked recurrence; timezone/DST policies; local SQLite and IndexedDB persistence; stale-write rejection; tombstones and validated backup/import; focus elapsed time and linked reminder lifecycle; task completion suppressing reminders; project task/milestone management; daily habit logs; career follow-ups and interactions; note capture/autosave/conversion and draft protection across navigation/concurrent tab edits; validated ChatGPT shortcuts and manual Codex references; settings persistence; mobile overflow; twelve MCP tools with opt-in and actual in-memory protocol calls; PostgreSQL RLS and CAS; and Supabase client sync requests against an isolated PostgreSQL test backend.

Implemented but **not native-runtime verified**: Tauri/Rust shell, SQLite-backed background scheduler, quiet hours, missed-due queries, durable duplicate claims, system tray, opt-in startup, native focus reconciliation, native toast actions, sound selection, OS-browser link opening and Windows Credential Manager auth storage. Windows CI now passes cargo check, six Rust tests and NSIS packaging. The package was installed, updated and launched locally. Settings notification-history UI loaded and a test dispatch request was accepted. Actual banner/sound delivery and the full reminder/tray/resume matrix remain open; see NATIVE_VERIFICATION.md.

**Live native cloud checkpoint passed:** the owner signed into the installed configured app with email/password; a native QA note reached Supabase, and a targeted server edit returned to the native editor after manual sync. The dedicated LifeOS schema and role-based isolation are live; see CLOUD_VERIFICATION.md. Separate web/desktop clients, offline retry/conflicts, session restart/rotation and production deployment remain unverified.

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

Full setup is in SETUP.md. Source files are committed and pushed to the private repository https://github.com/eFurkanSngl/LifeOS. No production deployment has been performed. No license has been selected.

## E. External configuration

- **Windows:** install the Visual Studio C++ workload, x64/x86 MSVC build tools and Windows SDK, verify WebView2, then rebuild in an appropriate developer terminal. Rust 1.99.1 is available locally under `.tools` without a system PATH modification. Cargo.lock is generated. Local source compilation still reports `link.exe not found`; Windows CI separately provides successful native compilation/tests/package evidence.
- **Supabase:** the dedicated LifeOS Free organization/project is live in Frankfurt. The initial schema and owner RLS were applied and tested on actual PostgreSQL, with isolation probe fixtures rolled back. Signup is disabled. Owner email/password login and a real native push/pull passed; separate-client offline/conflict checks remain open. See CLOUD_VERIFICATION.md. No service-role key or database password was collected.
- **Vercel:** follow SETUP.md for monorepo root/build settings and public environment values. Preview/production deployment has not been authorized or performed.
- **MCP:** enable the local desktop setting and register the documented stdio process with LIFEOS_MCP_ENABLED and the existing SQLite path. Manual Codex references do not imply automatic account chat discovery.

## F. Test results

| Check                                      | Result and boundary                                                                                                                                                                             |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest                                     | **58 passed**, 8 suites: 2 password-auth transport/privacy tests, 27 core, 14 SQLite/service, 2 IndexedDB/concurrency, 6 PostgreSQL schema/RLS, 4 sync protocol, 1 MCP, 2 React Testing Library |
| Playwright / installed Edge                | **13 passed**, including recurrence, reminder reschedule, career follow-up, offline capture, persisted settings mobile layout and two-tab note-draft conflict preservation                      |
| TypeScript strict                          | Passed                                                                                                                                                                                          |
| ESLint                                     | Passed; vendor downloads/build artifacts excluded                                                                                                                                               |
| Next.js production build                   | Passed on Next 16.4.5                                                                                                                                                                           |
| Desktop frontend production build          | Passed on Vite 7.3.7; this is **not** a Windows binary build                                                                                                                                    |
| Production dependency audit                | Zero reported advisories at checkpoint; see dependency-audit.json. This is not a proof of absence of vulnerabilities.                                                                           |
| Rust format/parser check                   | Passed with rustfmt                                                                                                                                                                             |
| Cargo check                                | **Passed on Windows CI**; local source compile still lacks MSVC linker                                                                                                                          |
| Rust tests / NSIS installer                | **6 passed**, package built in Windows CI; installer install/update exited 0 and app opened locally                                                                                             |
| Actual notifications/tray/resume           | **Partial**; background timed reminder submitted at 19:31:01, one durable row survives clean restart; visible banner/sound/actions, tray/sleep/crash recovery remain open                       |
| Live Supabase auth / RLS / two-device sync | Live RLS/CAS, native owner login, native push/server-edit/pull and clean-restart session restoration passed; separate-client offline/conflict and expiry/rotation acceptance pending              |
| Vercel deployment                          | **Not performed**                                                                                                                                                                               |
| Native memory                              | First warm visible empty-state sample: **430.25 MiB** summed working sets (LifeOS + 6 WebView processes); above target, not a full benchmark                                                    |

Desktop frontend output at the checkpoint is approximately 744 kB JavaScript (223 kB gzip) and 38 kB CSS (9 kB gzip). Rollup reports a large-chunk warning and harmless third-party Zod annotation warnings. The first measured working-set sum exceeds the 60–120 MB target. This includes shared pages and is not a private-memory measurement.

Evidence images: screenshots/dashboard.png and screenshots/mobile.png. They show the genuine empty initial state, not seeded personal achievements. Test-generated contacts/tasks use isolated browser profiles and temporary databases, not the user's normal data store.

## G. Known limitations

The Windows readiness gate is open; an installer cannot be called ready based on frontend tests. Notification payload acceptance is not proof of visible delivery. Sleep/shutdown, Do Not Disturb, process termination and permissions can prevent exact-time alerts. A crash in the durable-claim/submission window can leave an uncertain event; Settings now surfaces failed/uncertain events and offers an explicitly confirmed retry at a new instant while preserving the old claim. Toast actions after a banner moves into Action Center are not guaranteed by the chosen plugin.

The database currently uses typed versioned envelopes instead of the fully normalized tables in the master specification. Complete server-side domain constraints, durable incremental sync cursors and realtime pulls remain open. Auth now uses the owner-selected email/password flow; the Windows credential adapter is untested. Browser data is origin/profile-scoped; native data is account/disk protected but not app-encrypted. Initial cloud ownership is bound to one local profile. Conflict backups are downloaded JSON files and need private storage.

Recurring tasks now create one deterministic alarm for every configured occurrence. Rust rolls missing occurrences/alarms forward at boot and hourly; existing occurrences are edited independently when a series changes. Targeted TS/Rust/browser tests pass; installed visible alarm acceptance remains open. Habit streaks currently count consecutive calendar days rather than frequency-aware weekly targets. Prayer times can be represented by manually entered routines/blocks; no official calculation/location integration is implemented. Planner dragging moves days; precise times use forms. Markdown preview, a global OS capture shortcut, automatic Codex session discovery, a persistent workspace splitter, and complete unsaved-form protection remain open. Multi-record mutations/imports can be partially applied after a storage interruption; recovery uses version guards, tombstones, repeated import with duplicate skipping and explicit errors rather than assuming atomic distributed commits.

## H. Prioritized next actions

1. Windows CI check/tests/package now pass. Use the latest unsigned artifact for the installed acceptance matrix; local source development still needs the C++ workload.
2. Execute every installed-Windows acceptance check in REMINDER_ENGINE.md. Verify quiet hours, tray close, restart/sleep recovery, toast actions, sound, credentials, focus completion and actual memory usage.
3. Complete separate-client offline/conflict, sign-out and session restart/rotation checks in SETUP.md; dedicated project setup, native password login and native push/pull now pass. Run cloud security advisors; unrelated-user denial has passed the transaction-only role probe.
4. Verify the implemented recurring native alarms and uncertain-event recovery on the installed app, then close normalization/sync/security and memory-performance gates in ROADMAP.md before describing the full specification as complete.

Current cloud setup and verification boundaries: [CLOUD_VERIFICATION](CLOUD_VERIFICATION.md).
