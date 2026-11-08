use crate::Record;
use chrono::{DateTime, Datelike, Days, LocalResult, NaiveDate, TimeZone, Utc};

pub fn task_reminder_id(id: &str) -> Option<String> {
    let first = u8::from_str_radix(id.get(..1)?, 16).ok()? ^ 8;
    Some(format!("{:x}{}", first, id.get(1..)?))
}

fn local_instant(zone: chrono_tz::Tz, value: chrono::NaiveDateTime) -> Option<DateTime<Utc>> {
    match zone.from_local_datetime(&value) {
        LocalResult::Single(date) => Some(date.with_timezone(&Utc)),
        LocalResult::Ambiguous(a, b) => Some(a.min(b).with_timezone(&Utc)),
        LocalResult::None => None,
    }
}

pub fn expand(template: &Record, now: DateTime<Utc>) -> Result<Vec<Record>, String> {
    let data = &template.data;
    let rule = &data["recurrence"];
    let zone: chrono_tz::Tz = rule["timezone"]
        .as_str()
        .unwrap_or("Europe/Istanbul")
        .parse()
        .map_err(|_| "Invalid recurrence timezone")?;
    let (anchor, anchor_time) = if let Some(start) = data["scheduledAt"].as_str() {
        let instant = DateTime::parse_from_rfc3339(start)
            .map_err(|_| "Invalid recurrence start")?
            .with_timezone(&zone);
        (instant.date_naive(), Some(instant.time()))
    } else {
        let date = data["dueDate"]
            .as_str()
            .ok_or("Recurrence needs a start date")?;
        (
            NaiveDate::parse_from_str(date, "%Y-%m-%d").map_err(|_| "Invalid recurrence date")?,
            None,
        )
    };
    let first = now.with_timezone(&zone).date_naive();
    let interval = rule["interval"].as_i64().unwrap_or(1).clamp(1, 365);
    let frequency = rule["frequency"].as_str().unwrap_or("daily");
    let weekdays = rule["weekdays"].as_array();
    let mut records = Vec::new();
    for offset in 0..35 {
        let date = first
            .checked_add_days(Days::new(offset))
            .ok_or("Calendar overflow")?;
        let text = date.format("%Y-%m-%d").to_string();
        if date < anchor
            || rule["until"]
                .as_str()
                .is_some_and(|end| text.as_str() > end)
        {
            continue;
        }
        let days = (date - anchor).num_days();
        let months = i64::from(date.year() - anchor.year()) * 12 + i64::from(date.month())
            - i64::from(anchor.month());
        let matches = match frequency {
            "daily" | "interval" => days % interval == 0,
            "weekly" => {
                days / 7 % interval == 0
                    && if let Some(values) = weekdays.filter(|values| !values.is_empty()) {
                        values.iter().any(|day| {
                            day.as_u64() == Some(u64::from(date.weekday().num_days_from_sunday()))
                        })
                    } else {
                        date.weekday() == anchor.weekday()
                    }
            }
            "monthly" => {
                let next = if date.month() == 12 {
                    NaiveDate::from_ymd_opt(date.year() + 1, 1, 1)
                } else {
                    NaiveDate::from_ymd_opt(date.year(), date.month() + 1, 1)
                }
                .ok_or("Calendar overflow")?;
                let last = next.pred_opt().ok_or("Calendar overflow")?.day();
                months % interval == 0 && date.day() == anchor.day().min(last)
            }
            _ => return Err("Invalid recurrence frequency".into()),
        };
        if !matches {
            continue;
        }
        let at = if let Some(time) = anchor_time {
            let Some(at) = local_instant(zone, date.and_time(time)) else {
                continue;
            };
            Some(at)
        } else {
            None
        };
        let mut occurrence = data.clone();
        let object = occurrence.as_object_mut().ok_or("Invalid task")?;
        object.remove("recurrence");
        object.remove("completedAt");
        object.insert("seriesId".into(), template.id.clone().into());
        object.insert("occurrenceDate".into(), text.clone().into());
        object.insert("status".into(), "planned".into());
        if let Some(at) = at {
            object.insert(
                "scheduledAt".into(),
                at.to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
                    .into(),
            );
        } else {
            object.insert("dueDate".into(), text.clone().into());
            object.insert("allDay".into(), true.into());
            object.remove("endDate");
        }
        let id = format!(
            "{}{}0000",
            template.id.get(..24).ok_or("Invalid template ID")?,
            text.replace('-', "")
        );
        records.push(Record {
            id,
            kind: "task".into(),
            data: occurrence,
            version: 1,
            updated_at: now.to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
            deleted: false,
            cloud_version: 0,
            dirty: true,
        });
    }
    Ok(records)
}

pub fn reminder(task: &Record, now: DateTime<Utc>) -> Option<Record> {
    let data = &task.data;
    if task.deleted
        || data["archived"] == true
        || !data["recurrence"].is_null()
        || !matches!(
            data["status"].as_str(),
            Some("inbox" | "planned" | "in_progress")
        )
    {
        return None;
    }
    let minutes = data["reminderOffsetMinutes"].as_i64()?;
    if !(0..=10080).contains(&minutes) {
        return None;
    }
    let at = DateTime::parse_from_rfc3339(data["scheduledAt"].as_str()?)
        .ok()?
        .with_timezone(&Utc)
        - chrono::Duration::minutes(minutes);
    Some(Record {
        id: task_reminder_id(&task.id)?,
        kind: "reminder".into(),
        data: serde_json::json!({"title":data["title"],"taskId":task.id,"fireAt":at.to_rfc3339_opts(chrono::SecondsFormat::Millis,true),"status":"pending","sound":false}),
        version: 1,
        updated_at: now.to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
        deleted: false,
        cloud_version: 0,
        dirty: true,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    fn template(start: &str, zone: &str, frequency: &str) -> Record {
        Record {
            id: "12345678-1234-4000-8000-123456789012".into(),
            kind: "task".into(),
            data: serde_json::json!({"title":"Study","status":"planned","scheduledAt":start,"recurrence":{"frequency":frequency,"timezone":zone,"interval":1,"weekdays":[]},"reminderOffsetMinutes":15}),
            version: 1,
            updated_at: start.into(),
            deleted: false,
            cloud_version: 0,
            dirty: true,
        }
    }
    #[test]
    fn bounded_and_typescript_compatible_ids() {
        let source = template("2026-11-05T11:00:00Z", "Europe/Istanbul", "daily");
        let rows = expand(&source, "2026-11-05T00:00:00Z".parse().unwrap()).unwrap();
        assert_eq!(rows.len(), 35);
        assert_eq!(rows[0].id, "12345678-1234-4000-8000-202611050000");
        let alarm = reminder(&rows[0], Utc::now()).unwrap();
        assert_eq!(alarm.data["fireAt"], "2026-11-05T10:45:00.000Z");
        assert_eq!(alarm.id, "92345678-1234-4000-8000-202611050000");
    }
    #[test]
    fn date_only_daily_does_not_invent_time_or_alarm() {
        let mut source = template("2026-11-08T00:00:00Z", "Europe/Istanbul", "daily");
        source.data.as_object_mut().unwrap().remove("scheduledAt");
        source.data["dueDate"] = "2026-11-08".into();
        source.data["allDay"] = true.into();
        source.data["recurrence"]["until"] = "2026-11-10".into();
        let mut rows = expand(&source, "2026-11-08T00:00:00Z".parse().unwrap()).unwrap();
        assert_eq!(rows.len(), 3);
        assert_eq!(rows[0].id, "12345678-1234-4000-8000-202611080000");
        assert_eq!(rows[1].data["dueDate"], "2026-11-09");
        assert!(rows
            .iter()
            .all(|r| r.data["scheduledAt"].is_null() && reminder(r, Utc::now()).is_none()));
        rows[0].data["status"] = "completed".into();
        assert_eq!(rows[1].data["status"], "planned");
    }
    #[test]
    fn date_only_monthly_clamps_without_a_clock() {
        let mut source = template("2026-01-31T11:00:00Z", "America/New_York", "monthly");
        source.data.as_object_mut().unwrap().remove("scheduledAt");
        source.data["dueDate"] = "2026-01-31".into();
        let rows = expand(&source, "2026-02-01T12:00:00Z".parse().unwrap()).unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].data["dueDate"], "2026-02-28");
        assert!(rows[0].data["scheduledAt"].is_null());
    }
    #[test]
    fn dst_gap_is_skipped_and_fold_uses_first_instant() {
        let zone: chrono_tz::Tz = "America/New_York".parse().unwrap();
        assert!(local_instant(zone, "2026-03-08T02:30:00".parse().unwrap()).is_none());
        assert_eq!(
            local_instant(zone, "2026-11-01T01:30:00".parse().unwrap())
                .unwrap()
                .to_rfc3339(),
            "2026-11-01T05:30:00+00:00"
        );
    }
    #[test]
    fn monthly_clamps_and_completed_tasks_do_not_alarm() {
        let source = template("2026-01-31T11:00:00Z", "Europe/Istanbul", "monthly");
        let mut rows = expand(&source, "2026-02-01T00:00:00Z".parse().unwrap()).unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].data["occurrenceDate"], "2026-02-28");
        rows[0].data["status"] = "completed".into();
        assert!(reminder(&rows[0], Utc::now()).is_none());
    }
}
