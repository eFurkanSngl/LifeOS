# Desktop delivery checkpoint — 7 November 2026

Windows runtime `38ba8c1` is installed. Both CI jobs passed, including 71 unit tests, 21 browser flows and six Rust tests. Web usage/deployment and two-client acceptance remain deferred by the owner.

Delivered and checked:

- Modern dashboard, learning summary, direct Sohbetler route and persistent light/dark/system theme. Actual installed light and dark screens observed; light task/sidebar contrast corrected.
- Five lessons with sound-enabled 30-minute alarms, five PDF unit counters and nine all-day academic dates with independent preparation reminders. User progress was preserved. This is a one-time import, not monitoring of schedule changes.
- Real native cloud login and push/pull, populated installer upgrade and clean-restart session/data persistence. Long imported titles now match the cloud's existing limit without losing original text; non-settings outbox cleared.
- Native overdue-startup, quiet-hours release and hidden-tray submission each produced one persistent event, retained without duplication after restart. Earlier Settings banner and sound were owner-confirmed; no new visual/audio pass is inferred for these scheduler probes.
- Complete populated backup restored into an isolated SQLite database; duplicate import, newer-edit preservation and reopen passed for all 1,501 records.
- Local opt-in MCP registered in Codex; twelve actual tools available. One-time index contains 1,280 ChatGPT links and 181 Codex references, including archived sessions. It does not contain complete transcripts or automatically ingest new chats.

Remaining live acceptance: sleep/resume, abrupt-crash windows, toast button actions, minimized banner/audio, physical offline/reconnect and genuine session expiry/rotation. See LIVE_TEST.md for precise boundaries; browser tests cannot close native/cloud scenarios. The current version can be used for the owner's live test with these limitations recorded.

Performance remains measurable improvement work. The original 60–120 MB aspiration was explicitly not a guaranteed requirement. Current samples and their workload limitations are in PERFORMANCE.md; the target has not been achieved and low steady idle CPU has not been established by active/startup samples.

Separate future work: full chat transcript import, automatic incremental history ingestion, incremental/realtime cloud sync, normalized relational storage and partial graph recovery. Register the already-applied initial migration in Supabase CLI history before future db push. Password recovery/email changes require SMTP. None is silently marked complete.

No SaaS, paid AI, hidden collection or external messaging automation is planned. Windows startup preference remains the owner's choice.

## Interactive workspace and presentation update

Runtime `e45e978` is installed after successful frontend and Windows jobs (71 unit tests / 22 browser flows / six Rust tests). Native note desk/cards and new agenda controls were observed; all 1,501 payloads/tombstones survived installer update unchanged. README was rewritten for new users with six example-data views and detailed setup/usage/limitations. No personal native screenshots were published; the old calendar image was replaced with a synthetic one.

Spotify local controls, image attachments and user-started voice notes are separate proposals in INTEGRATIONS_NEXT.md. None is presented as implemented. Existing Windows lifecycle and cloud acceptance limits remain open.
