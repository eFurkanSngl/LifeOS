import { useEffect, useState } from "react";
import { Check, RefreshCw, Mail, ShieldCheck, Terminal } from "lucide-react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import type { LifeStore } from "./store";
import { tr } from "./i18n";
import { Section } from "./components";
import { Backup, download } from "./features/backup";
import type { Edit } from "./features/types";
import { NotificationLog } from "./notification-log";
export function Settings({ store, edit }: { store: LifeStore; edit: Edit }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [signingIn, setSigningIn] = useState(false),
    [startup, setStartup] = useState<boolean | null>(null);
  const native = isTauri();
  const [dbPath, setDbPath] = useState("");
  useEffect(() => {
    if (native)
      void isEnabled()
        .then(setStartup)
        .catch((e) => store.setError(String(e)));
  }, [native]);
  return (
    <div className="settings-grid">
      <Section
        title={tr.settings}
        sub={tr.settingsHint}
        action={
          <button
            className="button secondary"
            onClick={() =>
              edit("settings", store.settingsRecord, { ...store.settings })
            }
          >
            {tr.edit}
          </button>
        }
      >
        <dl className="settings-summary">
          <div>
            <dt>{tr.timezone}</dt>
            <dd>{store.settings.timezone}</dd>
          </div>
          <div>
            <dt>{tr.reminderDelivery}</dt>
            <dd>{native ? tr.native : tr.browser}</dd>
          </div>
          <div>
            <dt>{tr.quietEnabled}</dt>
            <dd>
              {store.settings.quietEnabled
                ? `${store.settings.quietStart} — ${store.settings.quietEnd}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt>{tr.closeToTray}</dt>
            <dd>{store.settings.closeToTray ? <Check size={16} /> : "—"}</dd>
          </div>
        </dl>
        <p className="muted">{tr.version}</p>
        {native && <p className="muted">{tr.globalCapture}</p>}
      </Section>
      <Section
        title={tr.notifications}
        sub={native ? tr.nativeHint : tr.desktopOnly}
      >
        {native ? (
          <>
            <button
              className="button secondary"
              onClick={() =>
                void store.run(
                  () => invoke("test_notification"),
                  tr.notificationRequested,
                )
              }
            >
              {tr.diagnostics}
            </button>
            <div className="startup-row">
              <label className="checkbox-label">
                <span>{tr.startup}</span>
                <input
                  type="checkbox"
                  disabled={startup === null}
                  checked={startup ?? false}
                  onFocus={() => {
                    if (startup === null)
                      void isEnabled()
                        .then(setStartup)
                        .catch((e) => store.setError(String(e)));
                  }}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    void store.run(async () => {
                      await (checked ? enable() : disable());
                      setStartup(await isEnabled());
                    });
                  }}
                />
              </label>
              <p className="muted">{tr.startupHint}</p>
            </div>
            <NotificationLog store={store} />
          </>
        ) : (
          <p className="muted">{tr.inAppOnly}</p>
        )}
      </Section>
      <Section title={tr.account} sub={tr.accountHint}>
        {store.cloud ? (
          <>
            <form
              className="account-form"
              onSubmit={(e) => {
                e.preventDefault();
                void store.run(async () => {
                  setSigningIn(true);
                  try {
                    await store.cloud!.signIn(email, password);
                  } finally {
                    setPassword("");
                    setSigningIn(false);
                  }
                }, tr.saved);
              }}
            >
              <label>
                {tr.email}
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </label>
              <label>
                {tr.password}
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </label>
              <button className="button primary" disabled={signingIn}>
                <Mail size={15} />
                {signingIn ? "…" : tr.signin}
              </button>
            </form>
            {store.signedIn && (
              <p className="success-text">
                <ShieldCheck size={15} />
                {tr.signedIn}
              </p>
            )}
            <div className="backup-actions">
              <button
                className="button secondary"
                disabled={store.syncing}
                onClick={() => void store.sync()}
              >
                <RefreshCw size={15} />
                {store.syncing ? tr.syncing : tr.sync}
              </button>
              <button
                className="text-button"
                onClick={() =>
                  void store.run(async () => {
                    const { error } = await store.cloud!.client.auth.signOut({
                      scope: "local",
                    });
                    if (error) throw new Error(error.message);
                  })
                }
              >
                {tr.signout}
              </button>
            </div>
            <p className="muted">
              {tr.lastSync}:{" "}
              {store.lastSync
                ? new Date(store.lastSync).toLocaleString("tr-TR", {
                    timeZone: store.settings.timezone,
                  })
                : tr.never}
            </p>
          </>
        ) : (
          <p className="muted">
            {native ? tr.nativeCloudMissing : tr.cloudMissing}
          </p>
        )}
      </Section>
      <Backup store={store} />
      {store.conflicts.length > 0 && (
        <Section title={tr.conflicts} sub={tr.conflictHint}>
          {store.conflicts.map((c) => (
            <article className="conflict" key={c.local.id}>
              <h3>{String(c.local.data.title)}</h3>
              <div className="conflict-versions">
                <pre>{JSON.stringify(c.local.data, null, 2)}</pre>
                <pre>{JSON.stringify(c.remote.data, null, 2)}</pre>
              </div>
              <div className="backup-actions">
                <button
                  className="button secondary"
                  onClick={() =>
                    void store.run(async () => {
                      download(c, "lifeos-conflict.json");
                      await store.service().repo.put(
                        {
                          ...c.local,
                          cloudVersion: c.remote.cloudVersion,
                          version: c.local.version + 1,
                          dirty: true,
                        },
                        c.local.version,
                      );
                      store.setConflicts((cs) =>
                        cs.filter((x) => x.local.id !== c.local.id),
                      );
                    })
                  }
                >
                  {tr.keepLocal}
                </button>
                <button
                  className="button secondary"
                  onClick={() =>
                    void store.run(async () => {
                      download(c, "lifeos-conflict.json");
                      await store
                        .service()
                        .repo.put(
                          { ...c.remote, version: c.local.version + 1 },
                          c.local.version,
                        );
                      store.setConflicts((cs) =>
                        cs.filter((x) => x.local.id !== c.local.id),
                      );
                    })
                  }
                >
                  {tr.keepCloud}
                </button>
              </div>
            </article>
          ))}
        </Section>
      )}
      <Section title={tr.codex} sub={tr.mcpHint}>
        <Terminal size={22} />
        {native && (
          <>
            <button
              className="button secondary"
              onClick={() =>
                void store.run(async () =>
                  setDbPath(await invoke<string>("database_path")),
                )
              }
            >
              {tr.databasePath}
            </button>
            {dbPath && (
              <input
                readOnly
                aria-label={tr.databasePath}
                value={dbPath}
                onFocus={(e) => e.target.select()}
              />
            )}
          </>
        )}
        <p className="muted">{tr.noAuto}</p>
        <p className="muted">{tr.installHint}</p>
        <button
          className="button secondary"
          onClick={() =>
            edit("settings", store.settingsRecord ?? undefined, {
              ...store.settings,
              title: "settings",
            })
          }
        >
          {tr.edit}
        </button>
      </Section>
    </div>
  );
}
export { Integrations } from "./features/conversations";
