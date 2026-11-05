import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { tr } from "../i18n";
import { Section } from "../components";
import type { LifeStore } from "../store";
export function download(value: unknown, name = "lifeos-backup.json") {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Backup({ store }: { store: LifeStore }) {
  return (
    <Section title={tr.security} sub={tr.securityHint}>
      <div className="backup-actions">
        <button
          className="button secondary"
          onClick={() =>
            void store.run(async () => download(await store.service().export()))
          }
        >
          <ArrowDownToLine size={16} />
          {tr.export}
        </button>
        <label className="button secondary">
          <ArrowUpFromLine size={16} />
          {tr.import}
          <input
            type="file"
            accept="application/json"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                if (file.size > 20 * 1024 * 1024) {
                  store.setError("Yedek dosyası 20 MB sınırını aşıyor.");
                  return;
                }
                void store.run(async () => {
                  const result = await store
                    .service()
                    .import(JSON.parse(await file.text()));
                  store.notify(
                    `${result.added} eklendi, ${result.skipped} atlandı.`,
                  );
                });
              }
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <p className="muted">{tr.importHint}</p>
    </Section>
  );
}
