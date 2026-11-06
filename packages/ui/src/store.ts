import { useCallback, useEffect, useRef, useState } from "react";
import { createRepository, LifeService } from "@lifeos/database";
import {
  type Entity,
  type Kind,
  entities,
  expandRecurrence,
  today,
  SETTINGS_ID,
  settingsSchema,
  remaining,
  retryDelay,
} from "@lifeos/core";
import { nativeAuthStorage } from "./native";
import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { CloudAdapter, type SyncConflict } from "@lifeos/integrations";
export function useLife(cloudUrl?: string, cloudKey?: string) {
  const [records, setRecords] = useState<Entity[]>([]),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [syncing, setSyncing] = useState(false),
    [conflicts, setConflicts] = useState<SyncConflict[]>([]),
    [lastSync, setLastSync] = useState(""),
    [cloudReady, setCloudReady] = useState(false),
    [signedIn, setSignedIn] = useState(false);
  const serviceRef = useRef<LifeService | null>(null),
    cloudRef = useRef<CloudAdapter | null>(null),
    channel = useRef<BroadcastChannel | null>(null),
    syncLock = useRef(false),
    retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    retryAttempt = useRef(0);
  const service = () => {
    if (!serviceRef.current)
      serviceRef.current = new LifeService(createRepository());
    return serviceRef.current;
  };
  const refresh = useCallback(async () => {
    const data = await service().list();
    setRecords(data);
    return data;
  }, []);
  const notify = useCallback((value: string) => {
    setToast(value);
  }, []);
  const run = useCallback(
    async <T>(
      action: () => Promise<T>,
      message?: string,
    ): Promise<T | undefined> => {
      try {
        setError("");
        const result = await action();
        await refresh();
        channel.current?.postMessage("changed");
        if (message) notify(message);
        return result;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return undefined;
      }
    },
    [refresh, notify],
  );
  useEffect(() => {
    let mounted = true;
    let unlisten: (() => void) | undefined;
    const boot = async () => {
      try {
        await refresh();
        if (!mounted) return;
        setReady(true);
        if (isTauri()) {
          const dispose = await listen(
            "records-changed",
            () => void refresh().catch((e) => setError(String(e))),
          );
          if (mounted) unlisten = dispose;
          else dispose();
        } else {
          channel.current = new BroadcastChannel("lifeos-records");
          channel.current.onmessage = () =>
            void refresh().catch((e) => setError(String(e)));
        }
        if (cloudUrl && cloudKey) {
          cloudRef.current ??= new CloudAdapter(
            cloudUrl,
            cloudKey,
            isTauri() ? nativeAuthStorage : undefined,
          );
          setCloudReady(true);
        }
      } catch (e) {
        setError(String(e));
      }
    };
    void boot();
    const focus = () => void refresh().catch((e) => setError(String(e)));
    window.addEventListener("focus", focus);
    return () => {
      mounted = false;
      unlisten?.();
      channel.current?.close();
      window.removeEventListener("focus", focus);
    };
  }, [refresh, cloudUrl, cloudKey]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  const settingsRecord = records.find(
      (r) => r.id === SETTINGS_ID && !r.deleted,
    ),
    settings = settingsSchema.parse(settingsRecord?.data ?? {});
  // Generate bounded occurrences only on boot/date rollover or template changes. Existing states are never overwritten.
  const templateKey = entities(records, "task")
    .filter(
      (t) =>
        t.data.recurrence &&
        !["cancelled", "completed"].includes(t.data.status),
    )
    .map((t) => t.id + ":" + t.version)
    .join("|");
  const day = today(settings.timezone);
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void (async () => {
      const rows = await service().list(),
        known = new Set(rows.map((r) => r.id));
      for (const template of entities(rows, "task").filter(
        (t) =>
          t.data.recurrence &&
          !["cancelled", "completed"].includes(t.data.status),
      )) {
        for (const item of expandRecurrence(template, day)) {
          if (cancelled) return;
          if (!known.has(item.id)) {
            await service().save("task", item.data, item.id, 0);
            known.add(item.id);
          }
        }
      }
      if (!cancelled) await refresh();
    })().catch((e) => setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, [ready, templateKey, day, refresh]);
  const save = (
    kind: Kind,
    data: unknown,
    id?: string,
    expectedVersion?: number,
  ) =>
    run(() => service().save(kind, data, id, expectedVersion), "Kaydedildi.");
  const remove = (record: Entity) =>
    run(() => service().remove(record), "Kayıt silindi.");
  const sync: () => Promise<void> = useCallback(async () => {
    if (!cloudRef.current || syncLock.current) return;
    syncLock.current = true;
    setSyncing(true);
    try {
      const result = await cloudRef.current.sync(service().repo);
      setConflicts(result.conflicts);
      setLastSync(result.at);
      retryAttempt.current = 0;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      if (retryTimer.current) clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(
        () => void sync(),
        retryDelay(retryAttempt.current++),
      );
    } finally {
      syncLock.current = false;
      setSyncing(false);
    }
  }, [refresh]);
  // Sync after local edits and on focus/reconnect. No full-database background polling.
  useEffect(() => {
    if (!cloudReady || !cloudRef.current) return;
    const subscription = cloudRef.current.client.auth.onAuthStateChange(
      (_event, session) => {
        setSignedIn(Boolean(session));
        if (!session && retryTimer.current) clearTimeout(retryTimer.current);
      },
    );
    return () => {
      subscription.data.subscription.unsubscribe();
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [cloudReady]);
  const pendingKey = records
    .filter((r) => r.dirty && r.kind !== "settings")
    .map((r) => r.id + ":" + r.version)
    .join("|");
  useEffect(() => {
    if (!signedIn) return;
    const timer = setTimeout(() => void sync(), 1500);
    const onFocus = () => void sync();
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
    };
  }, [signedIn, pendingKey, sync]);
  useEffect(() => {
    const onError = (event: Event) =>
      setError(String((event as CustomEvent).detail));
    window.addEventListener("lifeos-error", onError);
    return () => window.removeEventListener("lifeos-error", onError);
  }, []);
  // Only reconcile an active focus timer; elapsed time comes from timestamps.
  const activeFocus = entities(records, "focus").find(
    (r) => r.data.status === "running",
  );
  useEffect(() => {
    if (!ready || !activeFocus || isTauri()) return;
    let finishing = false;
    const timer = setInterval(() => {
      if (finishing || remaining(activeFocus.data) > 0) return;
      finishing = true;
      void (async () => {
        await service().save(
          "focus",
          {
            ...activeFocus.data,
            status: "completed",
            remainingMs: 0,
            resumedAt: undefined,
            endedAt: new Date().toISOString(),
          },
          activeFocus.id,
          activeFocus.version,
        );
        notify("Odak oturumu tamamlandı. Kısa bir mola ver.");
        await refresh();
      })().catch((e) => setError(String(e)));
    }, 1000);
    return () => clearInterval(timer);
  }, [ready, activeFocus?.id, activeFocus?.version, refresh, notify]);

  return {
    records,
    ready,
    error,
    setError,
    toast,
    notify,
    service,
    save,
    remove,
    run,
    refresh,
    settings,
    settingsRecord,
    sync,
    syncing,
    signedIn,
    conflicts,
    setConflicts,
    lastSync,
    cloud: cloudRef.current,
  };
}
export type LifeStore = ReturnType<typeof useLife>;
