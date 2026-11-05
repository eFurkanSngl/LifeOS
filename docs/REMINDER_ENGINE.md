# Native reminders and acceptance gate

Rust owns dispatch. SQLite reminder records persist title, associations, UTC fire time and status. An indexed due query runs every five seconds while the process lives, including a hidden WebView/tray state. A durable `(reminder_id,fire_at)` claim prevents ordinary duplicate dispatch after restart. Quiet hours use an IANA timezone and support intervals crossing midnight. Pending reminders missed while the process was stopped are reconsidered on startup; reminders missed during sleep are reconsidered on the next scheduler tick after resume.

One-time, deadline, habit, follow-up and task reminders use the same queue. The generic reminder form allows task/habit/contact links. Contact/application follow-up dates create a 09:00 reminder in the configured timezone. Creating a task can also create a reminder. Recurring task occurrences are independently tracked, but automatic per-occurrence reminder configuration is not complete; add reminders explicitly until that gate is implemented. Focus sessions create/update a linked reminder on start/resume and cancel it on pause/stop. Task completion/cancellation suppresses associated outstanding reminders through the service layer.

Closing to tray and minimizing to tray default off and require a saved user setting. The tray always offers open and quit. Autostart requires an explicit checkbox choice. Quitting exits the service; no external Windows Service or Task Scheduler job is silently installed. Native reminders are unavailable in the Vite browser preview and in Next.js.

Delivery boundary: the notification plugin accepting a payload is not proof that the user saw it. Notification history records dispatch, not guaranteed display. Windows Focus Assist/Do Not Disturb, disabled app notifications, an uninstalled app identity, sleep, shutdown or process termination can block alerts. There is no claim of waking a powered-off PC. A crash after a durable claim but before submission may suppress that one dispatch; the event remains uncertain. Failed/uncertain claims require a manual reschedule to a new instant. Native focus reminder dispatch also reconciles the session to completed without relying on the hidden WebView. The UI supports completion, snooze and reschedule; native toast action buttons are implemented using notification plugin 2.8.0 (start, snooze, reschedule, complete), but have not been compiled or verified on Windows. The plugin reports Windows actions only while the toast is visible; Action Center activation after it disappears is not a supported guarantee. OS-level Do Not Disturb diagnostics remain open.

Task Scheduler was considered: launching at login is useful and covered by opt-in autostart. Waking the PC and executing scheduled user-interactive tasks requires additional consent, power policy testing, per-user installation and recovery coordination. It is not implemented because it would otherwise suggest stronger guarantees than this build can verify.

## Windows manual acceptance

1. Build and install the NSIS package, launch it, and send a test notification from Settings. Record Windows version, LifeOS version, app notification settings and whether the banner/sound appeared. A successful Rust return alone is insufficient.
2. Create a reminder two minutes ahead; minimize the window. Verify one banner and one corresponding dispatch row. Snooze from the in-app notification center and verify the next alert and changed UTC fire time.
3. Enable close-to-tray, close the window, wait for another reminder, then reopen from the tray. Confirm no data loss. Disable the option and verify closing terminates the process.
4. Create a pending reminder, quit, wait past its due time, restart. Verify recovery and no repeated banner on another restart. Repeat with sleep/resume.
5. Set quiet hours across midnight and test a due reminder during and after quiet time. Test a changed timezone. Check overdue reminders remain visible.
6. Start/pause/resume a focus timer, hide the app, reopen and confirm timestamp-derived remaining time and exactly one linked queue entry.
7. Explicitly enable/disable Windows startup and inspect the OS setting. Test login behavior. Test installer upgrade/uninstall without deleting user data.
8. Measure idle CPU and all LifeOS/WebView/helper working sets together after warm-up. The 60–120 MB target is aspirational; no measured native memory claim is currently made.

Keep screenshots and notes from these checks. None is passed by the browser test suite.

Native API behavior was checked against the [notification plugin Rust reference](https://docs.rs/tauri-plugin-notification/2.8.0/tauri_plugin_notification/struct.NotificationBuilder.html). Payload preparation is distinct from visible OS delivery.
