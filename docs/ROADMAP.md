# Remaining delivery gates

1. Compile/check/test Rust on Windows, install the NSIS package and execute the reminder/tray/resume checklist. This is the main daily-use gate.
2. Verify the implemented native toast actions and sound policy; complete explicit dispatch error/uncertain-event recovery UI, OS notification diagnostics, and per-occurrence recurring reminders. Verify on the installed app.
3. Apply the generated initial Supabase migration to an explicitly selected owner project, verify email OTP and true desktop/web offline sync and conflict recovery. Verify Windows credential storage with real token size and rotation.
4. Move the envelope store to normalized relational tables with complete server-side domain validation, add incremental durable sync metadata/realtime, and exercise partial graph recovery and device-account separation.
5. Improve habit frequency-aware streak/target views (current streak is a calendar-day streak), prayer manual time blocks, Markdown preview, reminder-specific types, full keyboard reorder and custom focus presets. The planner supports day dragging and form-based time edits; minute-precision calendar dragging is not implemented.
6. Optional local Codex supported discovery adapter and global capture hotkey. Existing manual references, HTTPS links and MCP remain useful independently.
7. Measure Windows memory/CPU/startup, tighten nonce-based web CSP, complete a production security/accessibility audit and installer upgrade/backup recovery validation. No measured native benchmark is claimed.

No SaaS features, paid AI providers, scraping or external messaging automation are planned for v1.
