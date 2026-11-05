#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use chrono::{Timelike, Utc};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{sync::Mutex, time::Duration};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager,
};
use tauri_plugin_notification::NotificationExt;

const SETTINGS: &str = "00000000-0000-4000-8000-000000000001";
const KINDS: &[&str] = &[
    "task",
    "project",
    "habit",
    "habitLog",
    "note",
    "contact",
    "application",
    "shortcut",
    "codex",
    "focus",
    "review",
    "settings",
    "reminder",
    "milestone",
    "interaction",
];
struct Store {
    db: Mutex<Connection>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Record {
    id: String,
    kind: String,
    data: Value,
    version: i64,
    updated_at: String,
    deleted: bool,
    cloud_version: i64,
    dirty: bool,
}
fn read_records(db: &Connection) -> Result<Vec<Record>, String> {
    read_selected(db, 0)
}
fn read_selected(db: &Connection, selection: u8) -> Result<Vec<Record>, String> {
    let sql = if selection == 1 {
        "SELECT id,kind,data,version,updated_at,deleted,cloud_version,dirty FROM records WHERE kind='reminder' AND deleted=0 AND json_extract(data,'$.status')='pending' AND json_extract(data,'$.fireAt')<=strftime('%Y-%m-%dT%H:%M:%fZ','now') AND NOT EXISTS(SELECT 1 FROM notification_events e WHERE e.reminder_id=records.id AND e.fire_at=json_extract(records.data,'$.fireAt')) LIMIT 25"
    } else if selection == 2 {
        "SELECT id,kind,data,version,updated_at,deleted,cloud_version,dirty FROM records WHERE kind='focus' AND deleted=0 AND json_extract(data,'$.status')='running'"
    } else {
        "SELECT id,kind,data,version,updated_at,deleted,cloud_version,dirty FROM records"
    };
    let mut stmt = db.prepare(sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            let raw: String = row.get(2)?;
            Ok(Record {
                id: row.get(0)?,
                kind: row.get(1)?,
                data: serde_json::from_str(&raw).map_err(|e| {
                    rusqlite::Error::FromSqlConversionFailure(
                        2,
                        rusqlite::types::Type::Text,
                        Box::new(e),
                    )
                })?,
                version: row.get(3)?,
                updated_at: row.get(4)?,
                deleted: row.get(5)?,
                cloud_version: row.get(6)?,
                dirty: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}
fn put(db: &mut Connection, r: &Record, expected: i64) -> Result<(), String> {
    if uuid::Uuid::parse_str(&r.id).is_err()
        || !KINDS.contains(&r.kind.as_str())
        || !r.data.is_object()
        || r.data.to_string().len() > 100000
        || r.version != expected + 1
        || r.cloud_version < 0
        || chrono::DateTime::parse_from_rfc3339(&r.updated_at).is_err()
    {
        return Err("Invalid record envelope".into());
    }
    if r.kind == "reminder" {
        let at = r.data["fireAt"]
            .as_str()
            .ok_or("Reminder instant required")?;
        chrono::DateTime::parse_from_rfc3339(at).map_err(|_| "Invalid reminder time")?;
        if !["pending", "delivered", "completed", "cancelled"]
            .contains(&r.data["status"].as_str().unwrap_or(""))
        {
            return Err("Invalid reminder state".into());
        }
    }
    let tx = db.transaction().map_err(|e| e.to_string())?;
    let old: Option<(i64, String)> = tx
        .query_row(
            "SELECT version,kind FROM records WHERE id=?",
            [&r.id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    if old.as_ref().map_or(0, |o| o.0) != expected || old.as_ref().is_some_and(|o| o.1 != r.kind) {
        return Err("Record changed; refresh before saving".into());
    }
    tx.execute("INSERT INTO records(id,kind,data,version,updated_at,deleted,cloud_version,dirty) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,version=excluded.version,updated_at=excluded.updated_at,deleted=excluded.deleted,cloud_version=excluded.cloud_version,dirty=excluded.dirty",params![r.id,r.kind,r.data.to_string(),r.version,r.updated_at,r.deleted,r.cloud_version,r.dirty]).map_err(|e|e.to_string())?;
    tx.commit().map_err(|e| e.to_string())
}
use rusqlite::OptionalExtension;
#[tauri::command]
fn list_records(state: tauri::State<Store>) -> Result<Vec<Record>, String> {
    read_records(&state.db.lock().map_err(|_| "Database lock failed")?)
}
#[tauri::command]
fn put_record(
    app: tauri::AppHandle,
    state: tauri::State<Store>,
    record: Record,
    expected_version: i64,
) -> Result<(), String> {
    put(
        &mut state.db.lock().map_err(|_| "Database lock failed")?,
        &record,
        expected_version,
    )?;
    let _ = app.emit("records-changed", ());
    Ok(())
}
#[tauri::command]
fn test_notification(app: tauri::AppHandle) -> Result<(), String> {
    app.notification()
        .builder()
        .title("LifeOS bildirim testi")
        .body("Bu bildirimi gördüysen Windows teslimi çalışıyor.")
        .show()
        .map_err(|e| e.to_string())
}
#[tauri::command]
fn database_path(app: tauri::AppHandle) -> Result<String, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("lifeos.sqlite")
        .to_string_lossy()
        .to_string())
}
fn auth_entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new("LifeOS", "supabase-session-manifest")
        .map_err(|_| "Windows credential store unavailable".into())
}
#[derive(Serialize, Deserialize)]
struct AuthManifest {
    generation: String,
    count: usize,
}
fn auth_manifest() -> Result<Option<AuthManifest>, String> {
    match auth_entry()?.get_password() {
        Ok(v) => {
            let manifest: AuthManifest =
                serde_json::from_str(&v).map_err(|_| "Invalid auth manifest")?;
            if manifest.count > 32 || uuid::Uuid::parse_str(&manifest.generation).is_err() {
                return Err("Invalid auth manifest".into());
            }
            Ok(Some(manifest))
        }
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(_) => Err("Windows credential store unavailable".into()),
    }
}
fn auth_chunk(generation: &str, index: usize) -> Result<keyring::Entry, String> {
    keyring::Entry::new(
        "LifeOS",
        &format!("supabase-session-{}-{}", generation, index),
    )
    .map_err(|_| "Windows credential store unavailable".into())
}
fn clear_chunks(manifest: &AuthManifest) {
    for i in 0..manifest.count {
        if let Ok(entry) = auth_chunk(&manifest.generation, i) {
            let _ = entry.delete_credential();
        }
    }
}
#[tauri::command]
fn auth_storage_get() -> Result<Option<String>, String> {
    let Some(manifest) = auth_manifest()? else {
        return Ok(None);
    };
    let mut bytes = Vec::new();
    for i in 0..manifest.count {
        bytes.extend(
            auth_chunk(&manifest.generation, i)?
                .get_secret()
                .map_err(|_| "Windows credential read failed")?,
        );
    }
    String::from_utf8(bytes)
        .map(Some)
        .map_err(|_| "Invalid auth encoding".into())
}
#[tauri::command]
fn auth_storage_set(value: String) -> Result<(), String> {
    if value.len() > 48000 {
        return Err("Auth session too large".into());
    }
    let previous = auth_manifest()?;
    let generation = uuid::Uuid::new_v4().to_string();
    let chunks: Vec<&[u8]> = value.as_bytes().chunks(1600).collect();
    let manifest = AuthManifest {
        generation,
        count: chunks.len(),
    };
    for (i, chunk) in chunks.iter().enumerate() {
        if auth_chunk(&manifest.generation, i)?
            .set_secret(chunk)
            .is_err()
        {
            clear_chunks(&manifest);
            return Err("Windows credential write failed".into());
        }
    }
    let json = serde_json::to_string(&manifest).map_err(|_| "Auth serialization failed")?;
    if auth_entry()?.set_password(&json).is_err() {
        clear_chunks(&manifest);
        return Err("Windows credential manifest write failed".into());
    }
    if let Some(old) = previous {
        clear_chunks(&old)
    }
    Ok(())
}
#[tauri::command]
fn auth_storage_remove() -> Result<(), String> {
    let previous = auth_manifest()?;
    match auth_entry()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => {
            if let Some(old) = previous {
                clear_chunks(&old)
            }
            Ok(())
        }
        Err(_) => Err("Windows credential delete failed".into()),
    }
}
#[tauri::command]
fn open_external(app: tauri::AppHandle, url: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    let parsed = url::Url::parse(&url).map_err(|_| "Invalid link")?;
    if parsed.scheme() != "https"
        || !parsed.username().is_empty()
        || parsed.password().is_some()
        || url.len() > 2000
    {
        return Err("HTTPS link required".into());
    }
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| e.to_string())
}
fn quiet(settings: &Value, now: chrono::DateTime<Utc>) -> bool {
    if settings["quietEnabled"] != true {
        return false;
    }
    let tz = settings["timezone"]
        .as_str()
        .unwrap_or("Europe/Istanbul")
        .parse::<chrono_tz::Tz>()
        .unwrap_or(chrono_tz::Europe::Istanbul);
    let local = now.with_timezone(&tz);
    let time = format!("{:02}:{:02}", local.hour(), local.minute());
    let start = settings["quietStart"].as_str().unwrap_or("23:00");
    let end = settings["quietEnd"].as_str().unwrap_or("08:00");
    if start < end {
        time.as_str() >= start && time.as_str() < end
    } else if start > end {
        time.as_str() >= start || time.as_str() < end
    } else {
        false
    }
}
fn settings(db: &Connection) -> Value {
    db.query_row(
        "SELECT data FROM records WHERE id=? AND deleted=0",
        [SETTINGS],
        |r| r.get::<_, String>(0),
    )
    .ok()
    .and_then(|v| serde_json::from_str(&v).ok())
    .unwrap_or(serde_json::json!({}))
}
fn notification_action(
    app: &tauri::AppHandle,
    event: &tauri_plugin_notification::ActionPerformed,
) -> Result<(), String> {
    let action = event.action_id();
    if let Some(w) = app.get_webview_window("main") {
        if ["tap", "start", "reschedule"].contains(&action) {
            let _ = w.show();
            let _ = w.unminimize();
            let _ = w.set_focus();
        }
    }
    let Some(notification) = event.notification() else {
        return Ok(());
    };
    let extra = notification.extra();
    let Some(id) = extra.get("lifeosReminderId").and_then(Value::as_str) else {
        return Ok(());
    };
    let Some(at) = extra.get("lifeosFireAt").and_then(Value::as_str) else {
        return Ok(());
    };
    let state = app.state::<Store>();
    let mut db = state.db.lock().map_err(|_| "Database lock failed")?;
    let rows = read_records(&db)?;
    let Some(mut record) = rows
        .iter()
        .find(|r| r.id == id && !r.deleted && r.kind == "reminder")
        .cloned()
    else {
        return Ok(());
    };
    if record.data["fireAt"] != at
        || !["pending", "delivered"].contains(&record.data["status"].as_str().unwrap_or(""))
    {
        return Ok(());
    }
    if action == "reschedule" {
        let _ = app.emit("open-reminder", id);
        return Ok(());
    }
    let now = Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    if action == "snooze" || action == "complete" {
        let expected = record.version;
        record.version += 1;
        record.updated_at = now.clone();
        record.dirty = true;
        if action == "snooze" {
            let minutes = settings(&db)["snoozeMinutes"]
                .as_i64()
                .unwrap_or(15)
                .clamp(1, 1440);
            record.data["fireAt"] = (Utc::now() + chrono::Duration::minutes(minutes))
                .to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
                .into();
            record.data["status"] = "pending".into();
            record.data.as_object_mut().map(|o| o.remove("deliveredAt"));
        } else {
            record.data["status"] = "completed".into();
        }
        put(&mut db, &record, expected)?;
    }
    if action == "start" || action == "complete" {
        if let Some(task_id) = record.data["taskId"].as_str() {
            if let Some(mut task) = rows
                .iter()
                .find(|r| {
                    r.id == task_id
                        && !r.deleted
                        && r.kind == "task"
                        && !matches!(r.data["status"].as_str(), Some("completed" | "cancelled"))
                })
                .cloned()
            {
                let expected = task.version;
                task.version += 1;
                task.dirty = true;
                task.updated_at = now.clone();
                task.data["status"] = if action == "complete" {
                    "completed"
                } else {
                    "in_progress"
                }
                .into();
                if action == "complete" {
                    task.data["completedAt"] = now.into();
                }
                put(&mut db, &task, expected)?;
            }
        }
    }
    db.execute(
        "UPDATE notification_events SET detail=? WHERE reminder_id=? AND fire_at=?",
        params![action, id, at],
    )
    .map_err(|e| e.to_string())?;
    let _ = app.emit("records-changed", ());
    Ok(())
}
fn dispatch(app: &tauri::AppHandle) -> Result<(), String> {
    let state = app.state::<Store>();
    let mut db = state.db.lock().map_err(|_| "Database lock failed")?;
    let config = settings(&db);
    let now = Utc::now();
    let mut changed = false;
    for mut focus in read_selected(&db, 2)? {
        if let (Some(resumed), Some(ms)) = (
            focus.data["resumedAt"].as_str(),
            focus.data["remainingMs"].as_i64(),
        ) {
            if let Ok(start) = chrono::DateTime::parse_from_rfc3339(resumed) {
                let deadline = start.with_timezone(&Utc) + chrono::Duration::milliseconds(ms);
                if deadline <= now {
                    let expected = focus.version;
                    focus.version += 1;
                    focus.dirty = true;
                    focus.updated_at = now.to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
                    focus.data["status"] = "completed".into();
                    focus.data["remainingMs"] = 0.into();
                    focus.data["endedAt"] = deadline
                        .to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
                        .into();
                    focus.data.as_object_mut().map(|o| o.remove("resumedAt"));
                    put(&mut db, &focus, expected)?;
                    changed = true;
                }
            }
        }
    }
    if quiet(&config, now) {
        if changed {
            let _ = app.emit("records-changed", ());
        }
        return Ok(());
    }
    let records = read_selected(&db, 1)?;
    for mut r in records
        .into_iter()
        .filter(|r| !r.deleted && r.kind == "reminder" && r.data["status"] == "pending")
    {
        // Never deliver a reminder for an already finished or removed linked item.
        let linked = r.data["taskId"].as_str().or(r.data["focusId"].as_str());
        if let Some(id) = linked {
            let current = db
                .query_row("SELECT data,deleted FROM records WHERE id=?", [id], |row| {
                    Ok((row.get::<_, String>(0)?, row.get::<_, bool>(1)?))
                })
                .optional()
                .map_err(|e| e.to_string())?;
            let inactive = current
                .map(|(raw, deleted)| {
                    let value: Value = serde_json::from_str(&raw).unwrap_or(Value::Null);
                    deleted
                        || ["cancelled", "skipped", "paused"]
                            .contains(&value["status"].as_str().unwrap_or(""))
                        || (value["status"] == "completed"
                            && (r.data["taskId"].is_string()
                                || value["remainingMs"].as_i64().unwrap_or(1) > 0))
                })
                .unwrap_or(true);
            if inactive {
                let expected = r.version;
                r.version += 1;
                r.dirty = true;
                r.updated_at = now.to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
                r.data["status"] = "cancelled".into();
                put(&mut db, &r, expected)?;
                changed = true;
                continue;
            }
        }
        let at = r.data["fireAt"].as_str().unwrap_or("").to_string();
        let due = chrono::DateTime::parse_from_rfc3339(&at)
            .map(|d| d <= now)
            .unwrap_or(false);
        if !due {
            continue;
        }
        // Durable claim first: no automatic resend across a crash in the OS delivery window.
        let claimed=db.execute("INSERT OR IGNORE INTO notification_events(reminder_id,fire_at,state,created_at) VALUES(?,?,'dispatching',?)",params![r.id,at,now.to_rfc3339()]).map_err(|e|e.to_string())?;
        if claimed == 0 {
            continue;
        }
        let result = app
            .notification()
            .builder()
            .title("LifeOS")
            .body(r.data["title"].as_str().unwrap_or("Hatırlatma"))
            .action_type_id("lifeos-reminder")
            .extra("lifeosReminderId", &r.id)
            .extra("lifeosFireAt", &at)
            .sound(if config["sound"] == true || r.data["sound"] == true {
                "Default"
            } else {
                "silent"
            })
            .show();
        let (delivery, detail) = match result {
            Ok(()) => ("sent", String::new()),
            Err(e) => ("failed", e.to_string()),
        };
        db.execute(
            "UPDATE notification_events SET state=?,detail=? WHERE reminder_id=? AND fire_at=?",
            params![delivery, detail, r.id, at],
        )
        .map_err(|e| e.to_string())?;
        if delivery == "sent" {
            let expected = r.version;
            r.version += 1;
            r.updated_at = now.to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
            r.dirty = true;
            r.data["status"] = "delivered".into();
            r.data["deliveredAt"] = r.updated_at.clone().into();
            put(&mut db, &r, expected)?;
            changed = true;
        }
    }
    if changed {
        let _ = app.emit("records-changed", ());
    }
    Ok(())
}
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .args(["--autostart"])
                .build(),
        )
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            let db = Connection::open(dir.join("lifeos.sqlite"))?;
            let version: i64 = db.query_row("PRAGMA user_version", [], |r| r.get(0))?;
            if version > 1 {
                return Err("LifeOS database schema is newer than this application".into());
            }
            db.execute_batch(include_str!("../../../../packages/database/schema.sql"))?;
            app.manage(Store { db: Mutex::new(db) });
            use tauri_plugin_notification::{Action, ActionType};
            app.notification()
                .register_action_types(vec![ActionType::builder("lifeos-reminder")
                    .actions(vec![
                        Action::builder("start", "Başlat").build(),
                        Action::builder("snooze", "Ertele").build(),
                        Action::builder("reschedule", "Yeniden planla").build(),
                        Action::builder("complete", "Tamamla").build(),
                    ])
                    .build()])?;
            let actions_handle = app.handle().clone();
            app.notification().on_action(move |event| {
                if let Err(error) = notification_action(&actions_handle, event) {
                    eprintln!("LifeOS notification action failed: {}", error)
                }
            })?;
            let show = MenuItem::with_id(app, "show", "LifeOS'u aç", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Çıkış", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;
            let mut rgba = vec![0u8; 32 * 32 * 4];
            for pixel in rgba.chunks_mut(4) {
                pixel.copy_from_slice(&[49, 92, 235, 255]);
            }
            TrayIconBuilder::new()
                .icon(tauri::image::Image::new_owned(rgba, 32, 32))
                .tooltip("LifeOS")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.unminimize();
                            let _ = w.set_focus();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => (),
                })
                .build(app)?;
            let handle = app.handle().clone();
            std::thread::spawn(move || loop {
                if let Err(e) = dispatch(&handle) {
                    eprintln!("LifeOS reminder dispatch failed: {}", e);
                }
                std::thread::sleep(Duration::from_secs(5));
            });
            // MCP can change this database without frontend IPC. data_version gives cheap change detection.
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                let mut previous = 0i64;
                loop {
                    std::thread::sleep(Duration::from_secs(2));
                    let state = handle.state::<Store>();
                    if let Ok(db) = state.db.lock() {
                        let current = db
                            .query_row("PRAGMA data_version", [], |r| r.get::<_, i64>(0))
                            .unwrap_or(previous);
                        if current != previous {
                            previous = current;
                            let _ = handle.emit("records-changed", ());
                        }
                    };
                }
            });
            Ok(())
        })
        .on_window_event(|window, event| {
            let state = window.state::<Store>();
            let config = state
                .db
                .lock()
                .ok()
                .map(|db| settings(&db))
                .unwrap_or_default();
            match event {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    if config["closeToTray"] == true {
                        api.prevent_close();
                        let _ = window.hide();
                    }
                }
                tauri::WindowEvent::Resized(_) => {
                    if config["minimizeToTray"] == true && window.is_minimized().unwrap_or(false) {
                        let _ = window.hide();
                    }
                }
                _ => (),
            }
        })
        .invoke_handler(tauri::generate_handler![
            list_records,
            put_record,
            test_notification,
            database_path,
            auth_storage_get,
            auth_storage_set,
            auth_storage_remove,
            open_external
        ])
        .run(tauri::generate_context!())
        .expect("LifeOS could not start");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn quiet_across_midnight() {
        let c = serde_json::json!({"quietEnabled":true,"timezone":"Europe/Istanbul","quietStart":"23:00","quietEnd":"08:00"});
        assert!(quiet(&c, "2026-11-05T22:00:00Z".parse().unwrap()));
        assert!(!quiet(&c, "2026-11-05T12:00:00Z".parse().unwrap()));
    }
    #[test]
    fn durable_claim_is_unique() {
        let db = Connection::open_in_memory().unwrap();
        db.execute_batch(include_str!("../../../../packages/database/schema.sql"))
            .unwrap();
        let sql="INSERT OR IGNORE INTO notification_events(reminder_id,fire_at,state,created_at) VALUES('a','2026-11-05','dispatching','now')";
        assert_eq!(db.execute(sql, []).unwrap(), 1);
        assert_eq!(db.execute(sql, []).unwrap(), 0);
    }
}
