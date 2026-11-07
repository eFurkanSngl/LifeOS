# Optional local Codex connection

The server uses the official TypeScript MCP SDK with stdio. It is a separate Node 24 process; it does not require the web server and does not expose a port. The desktop and MCP must point to the same existing SQLite file.

1. Launch the real desktop app once. Enable **Ayarlar → Yerel MCP erişimini etkinleştir** and save. Leave it off when unused.
2. Use the actual Tauri app data directory. On Windows this is normally `%APPDATA%\local.lifeos.workspace\lifeos.sqlite`; the restricted `database_path` command returns the authoritative path. Do not point MCP to a browser profile or unrelated database.
3. Register a stdio process in your MCP client's supported configuration. For Codex TOML, adapt the following absolute paths to your installation:

```toml
[mcp_servers.lifeos]
command = "C:\\Program Files\\nodejs\\node.exe"
args = ["C:\\absolute\\LifeOS\\node_modules\\tsx\\dist\\cli.mjs", "C:\\absolute\\LifeOS\\services\\mcp-server\\src\\index.ts"]
cwd = "C:\\absolute\\LifeOS"

[mcp_servers.lifeos.env]
LIFEOS_MCP_ENABLED = "1"
LIFEOS_DB_PATH = "C:\\Users\\YOUR_USER\\AppData\\Roaming\\local.lifeos.workspace\\lifeos.sqlite"
```

If your Codex installation uses a different node.exe path, use `Get-Command node` to find it. This file is an example, not an automatic change to your Codex settings. Node's SQLite binding may print an experimental-feature notice to stderr on some releases; protocol stdout remains clean.

Tools: `lifeos_list_tasks`, `lifeos_get_task`, `lifeos_create_task`, `lifeos_update_task`, `lifeos_complete_task`, `lifeos_list_projects`, `lifeos_get_project`, `lifeos_create_reminder`, `lifeos_list_reminders`, `lifeos_add_note`, `lifeos_list_notes`, `lifeos_get_today_schedule`.

Read before updating; pass `expectedVersion` for updates and completion. Scheduling arguments are explicit UTC instants, never ambiguous natural language. List tools cap results at 200. There is no delete tool and no arbitrary SQL/shell/filesystem tool. Task references must exist in LifeOS. Tool outcomes are recorded in the private SQLite audit table. Native notifications still require the desktop process even if MCP writes while it is closed.

ChatGPT shortcuts launch their original HTTPS conversations. Codex entries store session references, optional HTTPS links and notes. A user-authorized history index can also be imported through the connected desktop app's official history tools, including archived Codex sessions. This imports titles and links/references; full messages remain in their source application. No sessions, cookies, browser databases or undocumented cloud APIs are scraped. Automatic ongoing discovery and Codex desktop deep-link launching are not implemented.

## Local setup verified on 7 November 2026

The `lifeos` stdio entry was added to the user's Codex config after taking a private backup. It uses the installed Node executable, absolute tsx/server/tsconfig paths and the actual existing native SQLite database. App MCP opt-in is enabled. A real SDK client connected, discovered twelve tools, listed tasks, wrote a setup note through `lifeos_add_note` and retrieved it through `lifeos_list_notes`. No API key or public HTTP endpoint was needed. The current chat may need a client restart/new session before its tool inventory includes the new server.

Large history lists show forty entries at a time in Integrations with search and a load-more button; the right workspace panel shows eight from each provider. Source titles remain stored in full. Codex references use `codex resume <session-id>`; they are not claimed to be working desktop deep links.

The owner selected **all conversation history**. Completed source pagination returned 1,280 active ChatGPT chats, no archived ChatGPT entries, 170 active Codex sessions and 11 archived Codex sessions. All 1,461 title/link/reference records were imported after a private backup. A second import added zero and skipped 1,461. Original message bodies were not copied. Private source data and setup/config backups are ignored under `.tools`.

Source `0bed913` passed frontend and Windows jobs in https://github.com/eFurkanSngl/LifeOS/actions/runs/42365766039 and was installed successfully. All nineteen existing task records remained, including five PDF trackers at 0/8. The actual registered LifeOS MCP tools became available in this chat; `lifeos_list_notes` read the setup note and `lifeos_list_tasks` read all nineteen tasks after the history import. A separate configured-client check also connected from outside the workspace. Installed UI visual acceptance remains open because Computer Use still fails to initialize; the README history image is clearly labeled synthetic browser test data.
