# Remaining delivery gates — desktop priority

Web usage/deployment and two-client web/desktop acceptance are explicitly deferred by the owner.

1. **Installed acceptance:** the owner confirmed Settings notification banner and sound. Background submission and clean-restart duplicate suppression passed. Complete tray/minimized, missed startup, sleep/resume, quiet hours, snooze/reschedule and toast actions using LIVE_TEST.md; these remain real user checks.
2. **Data and session recovery:** real native login, push/pull and clean-restart session restoration passed. Offline SQLite graph persistence and duplicate-safe backup restoration have automated coverage. Real expiry/rotation, sign-out, full populated upgrade and restore acceptance remain open.
3. **Desktop features:** Markdown preview, weekday/weekly habit goals and streaks, global capture, persisted workspace sizing, custom focus presets, dirty-form/native close warning and 15-minute day-planner dropping/keyboard movement are implemented in b2868c1. Native spot checks and the user's final live test follow; prayer times can use manually scheduled tasks/routines, with no location/calculation provider.
4. **Performance:** main JS decreased from about 744 kB to 615 kB; gzip 223 kB to 182 kB. Measure the installed build using PERFORMANCE.md. The previous 430.25 MiB summed working set exceeded the 60–120 MiB target; no claim of achieving that target yet.
5. **Calendar:** five source-confirmed future Anadolu eKampüs sessions were imported into native SQLite with 30-minute sound-enabled alarms after taking a backup. No inferred recurring lessons were created. This is a one-time import, not automatic schedule monitoring.
6. **MCP and conversation references:** local opt-in and Codex client registration are configured; twelve stdio tools passed an actual note write/read check. Conversation titles and links/references can be imported from the connected app's paginated history. This is a one-time index, not automatic monitoring, full transcript ingestion or Codex desktop deep-link launching.
7. **Separate architecture work:** normalize the envelope store, complete server-side domain constraints, incremental sync/realtime and partial graph transaction recovery. Register the SQL-applied initial migration in Supabase CLI history before future db push. These are not silently treated as completed desktop work.

No SaaS, paid AI, external messaging automation or hidden data collection is planned.
