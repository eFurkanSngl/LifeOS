import {
  createClient,
  type SupabaseClient,
  type SupportedStorage,
} from "@supabase/supabase-js";
import { type Entity, recordSchema, offsetInstant } from "@lifeos/validation";
import type { Repository } from "@lifeos/database";
export type SyncConflict = { local: Entity; remote: Entity };
export const providers = [
  { id: "chatgpt", name: "ChatGPT", capabilities: ["conversation-links"] },
  {
    id: "codex",
    name: "Codex",
    capabilities: ["manual-sessions", "local-mcp"],
  },
  { id: "supabase", name: "Supabase", capabilities: ["auth", "sync"] },
];
export class CloudAdapter {
  client: SupabaseClient;
  constructor(url: string, key: string, storage?: SupportedStorage) {
    const u = new URL(url);
    if (u.protocol !== "https:" || !u.hostname.endsWith(".supabase.co"))
      throw new Error("Supabase HTTPS adresi gerekli.");
    this.client = createClient(url, key, {
      auth: {
        persistSession: true,
        storage:
          storage ??
          (typeof sessionStorage !== "undefined" ? sessionStorage : undefined),
        detectSessionInUrl: false,
      },
    });
  }
  async sendCode(email: string) {
    const { error } = await this.client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (error) throw new Error(error.message);
  }
  async signIn(email: string, password: string) {
    const { error } = await this.client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    // Never surface raw provider details or credentials in a UI error/log.
    if (error)
      throw new Error("Giriş yapılamadı. E-posta ve şifrenizi kontrol edin.");
  }
  async verify(email: string, token: string) {
    const { error } = await this.client.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    if (error) throw new Error(error.message);
  }
  async user() {
    const { data, error } = await this.client.auth.getUser();
    if (error)
      throw new Error("Bulut oturumu bulunamadı. Ayarlardan giriş yapın.");
    if (!data.user) throw new Error("Giriş gerekli.");
    return data.user;
  }
  async sync(
    repo: Repository,
  ): Promise<{ conflicts: SyncConflict[]; at: string }> {
    const user = await this.user();
    const bound = localStorage.getItem("lifeos-cloud-owner");
    if (bound && bound !== user.id)
      throw new Error(
        "Bu yerel çalışma alanı başka bir hesaba bağlı. Farklı bir tarayıcı profili kullanın.",
      );
    localStorage.setItem("lifeos-cloud-owner", user.id);
    const local = await repo.list(),
      conflicts: SyncConflict[] = [];
    // Parents before dependants. Persisted tombstones preserve reference integrity.
    const rank: Record<string, number> = {
      project: 0,
      habit: 0,
      contact: 0,
      application: 0,
      note: 0,
      shortcut: 0,
      codex: 1,
      milestone: 1,
      task: 2,
      habitLog: 2,
      interaction: 2,
      focus: 3,
      reminder: 4,
      review: 0,
    };
    const mutations = local
      .filter((r) => r.dirty && r.kind !== "settings")
      .sort(
        (a, b) =>
          (rank[a.kind] ?? 5) - (rank[b.kind] ?? 5) ||
          Number(Boolean(a.data.seriesId)) - Number(Boolean(b.data.seriesId)),
      );
    for (const record of mutations) {
      const { data, error } = await this.client.rpc("lifeos_push", {
        p_id: record.id,
        p_kind: record.kind,
        p_data: record.data,
        p_deleted: record.deleted,
        p_expected: record.cloudVersion,
      });
      if (error) throw new Error(error.message);
      const result = data as {
        ok: boolean;
        record: {
          id: string;
          kind: Entity["kind"];
          data: Entity["data"];
          version: number;
          deleted: boolean;
          updated_at: string;
        };
      };
      if (!result?.record) throw new Error("Bulut yanıtı geçersiz.");
      const remote = fromCloud(result.record);
      if (!result.ok) {
        conflicts.push({ local: record, remote });
        continue;
      }
      // CAS prevents acknowledging a local edit made while network request was in flight.
      try {
        await repo.put(
          {
            ...record,
            cloudVersion: remote.cloudVersion,
            dirty: false,
            version: record.version + 1,
          },
          record.version,
        );
      } catch {
        const latest = (await repo.list()).find((r) => r.id === record.id);
        if (
          !latest ||
          !latest.dirty ||
          latest.cloudVersion !== record.cloudVersion
        ) {
          throw new Error(
            "Eşitleme sırasında kayıt değişti. Yeniden eşitleyin.",
          );
        }
        // Acknowledge only the remote base; preserve the newer local payload and outbox.
        await repo.put(
          {
            ...latest,
            cloudVersion: remote.cloudVersion,
            version: latest.version + 1,
            dirty: true,
          },
          latest.version,
        );
      }
    }
    const pending = new Set(conflicts.map((c) => c.local.id));
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await this.client
        .from("lifeos_records")
        .select("*")
        .eq("user_id", user.id)
        .order("id")
        .range(offset, offset + 499);
      if (error) throw new Error(error.message);
      for (const row of data ?? []) {
        const remote = fromCloud(row),
          current = (await repo.list()).find((r) => r.id === remote.id);
        if (pending.has(remote.id)) continue;
        if (current?.dirty) {
          if (current.cloudVersion !== remote.cloudVersion)
            conflicts.push({ local: current, remote });
          continue;
        }
        if (current?.cloudVersion === remote.cloudVersion) continue;
        await repo.put(
          { ...remote, version: (current?.version ?? 0) + 1 },
          current?.version ?? 0,
        );
      }
      if (!data || data.length < 500) break;
    }
    return { conflicts, at: new Date().toISOString() };
  }
}
function fromCloud(r: {
  id: string;
  kind: Entity["kind"];
  data: Entity["data"];
  version: number;
  deleted: boolean;
  updated_at: string;
}): Entity {
  return recordSchema.parse({
    id: r.id,
    kind: r.kind,
    data: r.data,
    version: r.version,
    cloudVersion: r.version,
    dirty: false,
    deleted: r.deleted,
    updatedAt: new Date(offsetInstant.parse(r.updated_at)).toISOString(),
  });
}
