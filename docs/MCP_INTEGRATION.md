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

ChatGPT shortcuts launch their original HTTPS conversations. Codex entries store manual references and optional HTTPS links. Neither scrapes sessions, cookies, browser data or undocumented cloud APIs, and neither claims access to all account chats. Automatic discovery and Codex deep-link launching are intentionally not implemented.
