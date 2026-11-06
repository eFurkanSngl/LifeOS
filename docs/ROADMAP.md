# Remaining delivery gates

1. Execute the full installed reminder/tray/resume checklist. Windows CI check/test/package and local installer launch now pass; see NATIVE_VERIFICATION.md. This is the main daily-use gate.
2. Verify the implemented native toast actions and sound policy; verify the new dispatch error/uncertain-event recovery UI, Windows settings link, and per-occurrence recurring reminders on the installed app. These are implemented and have targeted unit/browser coverage; visible banner/action/sleep recovery acceptance remains open.
3. The separate LifeOS organization/project, initial schema, owner isolation, owner-selected password login, real native push/pull and clean-restart session restoration are verified; see CLOUD_VERIFICATION.md. Next verify separate desktop/web clients, offline sync, conflict recovery, sign-out and Windows credential expiry/rotation. Register the existing SQL-applied migration in CLI history before future db push.
4. Move the envelope store to normalized relational tables with complete server-side domain validation, add incremental durable sync metadata/realtime, and exercise partial graph recovery and device-account separation.
5. Improve habit frequency-aware streak/target views (current streak is a calendar-day streak), prayer manual time blocks, Markdown preview, reminder-specific types, full keyboard reorder and custom focus presets. The planner supports day dragging and form-based time edits; minute-precision calendar dragging is not implemented.
6. Optional local Codex supported discovery adapter and global capture hotkey. Existing manual references, HTTPS links and MCP remain useful independently.
7. Measure Windows memory/CPU/startup, tighten nonce-based web CSP, complete a production security/accessibility audit and installer upgrade/backup recovery validation. The first native working-set sample is 430.25 MiB with WebView helpers, above the 60–120 MB goal; CPU/startup and sustained workload measurement remain open.

No SaaS features, paid AI providers, scraping or external messaging automation are planned for v1.
