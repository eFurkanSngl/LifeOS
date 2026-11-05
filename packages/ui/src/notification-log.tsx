import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { tr } from "./i18n";
import { Modal } from "./components";
import type { LifeStore } from "./store";
type EventRow = {
  reminderId: string;
  fireAt: string;
  state: string;
  createdAt: string;
  detail: string;
  title: string;
};
export function NotificationLog({ store }: { store: LifeStore }) {
  const [events, setEvents] = useState<EventRow[]>([]),
    [retry, setRetry] = useState<EventRow | null>(null);
  const refresh = async () => {
    setEvents(await invoke<EventRow[]>("notification_events"));
  };
  useEffect(() => {
    void refresh().catch((error) => store.setError(String(error)));
  }, []);
  const states: Record<string, string> = {
    sent: tr.dispatchSubmitted,
    failed: tr.dispatchFailed,
    uncertain: tr.dispatchUncertain,
    dispatching: tr.dispatchInProgress,
  };
  return (
    <>
      <div className="backup-actions">
        <button
          className="button secondary"
          onClick={() =>
            void store.run(() => invoke("open_notification_settings"))
          }
        >
          {tr.windowsNotificationSettings}
        </button>
        <button className="text-button" onClick={() => void store.run(refresh)}>
          {tr.refreshHistory}
        </button>
      </div>
      <p className="muted">{tr.notificationSettingsHint}</p>
      <h3>{tr.notificationHistory}</h3>
      {events.length === 0 ? (
        <p className="muted">{tr.noNotificationEvents}</p>
      ) : (
        events.map((event) => (
          <div
            className="notification-event"
            key={event.reminderId + event.fireAt}
          >
            <div className="simple-row">
              <span>
                {event.title}
                <small>
                  {new Date(event.createdAt).toLocaleString("tr-TR", {
                    timeZone: store.settings.timezone,
                  })}
                </small>
              </span>
              <span
                className={`badge ${event.state === "failed" || event.state === "uncertain" ? "critical" : ""}`}
              >
                {states[event.state] ?? event.state}
              </span>
              {["failed", "uncertain"].includes(event.state) && (
                <button className="text-button" onClick={() => setRetry(event)}>
                  {tr.retryNotification}
                </button>
              )}
            </div>
            {event.detail && <p className="muted prewrap">{event.detail}</p>}
          </div>
        ))
      )}
      {retry && (
        <Modal title={tr.retryNotification} onClose={() => setRetry(null)}>
          <p>{retry.title}</p>
          <p className="muted">{tr.retryNotificationHint}</p>
          <div className="form-actions">
            <button className="button secondary" onClick={() => setRetry(null)}>
              {tr.cancel}
            </button>
            <button
              className="button primary"
              onClick={() =>
                void store.run(async () => {
                  await invoke("retry_notification", { id: retry.reminderId });
                  await refresh();
                  setRetry(null);
                }, tr.notificationRequested)
              }
            >
              {tr.retryNotification}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
