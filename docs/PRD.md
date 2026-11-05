# Product scope

LifeOS reduces the number of commitments kept in memory. Capture a thought first; explicitly choose dates and reminders later. The default language is Turkish and the default IANA timezone is Europe/Istanbul. Empty workspaces contain no invented activity.

Priority order: reliable reminders, fast capture, daily planning, recurring learning, projects, career contacts, ideas, conversation shortcuts, optional local MCP. Local functionality does not require a cloud account. No SaaS, team, subscription, marketplace, scraping, automatic external messaging or paid AI functionality.

The primary journey is capture → schedule → remind → complete → review. A completed recurring occurrence is independent of every other occurrence. Reminder delivery requires the desktop process and compatible Windows notification settings. The web client explicitly describes itself as an in-app reminder list, not a native alarm service.

Acceptance requires the Windows checks in REMINDER_ENGINE.md, live cloud checks in SETUP.md, and all automated tests. An untested native adapter is not a passed product gate.
