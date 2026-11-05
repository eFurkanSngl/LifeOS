# Architecture

Both clients render `packages/ui`. Next.js serves a public application shell; no private records are rendered on the server. Private cloud access is authenticated in the client and restricted by PostgreSQL RLS. This keeps the app usable locally before a cloud project exists.

UI → LifeService → Repository is the application boundary. LifeService validates domain input, creates metadata, checks references, writes records with compare-and-swap, completes task reminders, and schedules focus reminders. Repository implementations are IndexedDB for browsers, restricted Tauri IPC for native clients, and Node's SQLite binding for the MCP process. Domain calculations depend on neither React nor a platform.

SQLite WAL allows Rust and the optional stdio MCP child process to access the same database. Expected local versions prevent lost updates. Rust owns native reminder dispatch; the WebView does not own an alarm timer. UI updates arrive through Tauri events and cheap SQLite `data_version` detection. Browser tabs receive BroadcastChannel invalidations. Reads occur at startup and invalidation, not constant browser full-database polling.

CloudAdapter uses authenticated CAS RPC for pushes, dependency ordering, and paginated reads for pulls. Dirty records are the durable coalescing outbox. Settings and MCP enablement remain local to each device. Cloud failures cannot delete pending local changes. Authentication is optional and email OTP avoids redirect/deep-link token handling. Native refresh sessions use Windows Credential Manager; browser sessions use session storage.

Deliberate limits: one cloud account binding per local browser/native WebView profile; no realtime subscription yet (sync on local changes, login, focus, reconnect or explicit request); no third-party calendar; no automatic Codex discovery; no prayer-time calculation; no public MCP listener. See ROADMAP for production gates and limitations rather than assuming the master specification is complete.
