import { useState } from "react";
import { Plus, Clock3 } from "lucide-react";
import { entities, today } from "@lifeos/core";
import { tr, label } from "../i18n";
import { Empty, EditButton, DeleteButton, ExternalLink } from "../components";
import type { LifeStore } from "../store";
import type { Edit } from "./types";
export function Career({
  store,
  edit,
  search,
}: {
  store: LifeStore;
  edit: Edit;
  search: string;
}) {
  const [view, setView] = useState<"contact" | "application">("contact");
  const rows = entities(store.records, view).filter((r) =>
    `${r.data.title} ${r.data.company}`
      .toLocaleLowerCase("tr")
      .includes(search.toLocaleLowerCase("tr")),
  );
  return (
    <>
      <div className="toolbar">
        <div className="filter-tabs">
          <button
            className={view === "contact" ? "selected" : ""}
            onClick={() => setView("contact")}
          >
            {tr.contacts}
          </button>
          <button
            className={view === "application" ? "selected" : ""}
            onClick={() => setView("application")}
          >
            {tr.applications}
          </button>
        </div>
        <button className="button primary" onClick={() => edit(view)}>
          <Plus size={16} />
          {tr.new}
        </button>
      </div>
      <div className="career-list">
        {rows.map((r) => (
          <article className="panel contact-card" key={r.id}>
            <div className="contact-avatar">{r.data.title.slice(0, 1)}</div>
            <div className="contact-content">
              <div className="section-heading">
                <h3>{r.data.title}</h3>
                <span className="badge">{label(r.data.status)}</span>
              </div>
              <p className="muted">
                {r.data.company}
                {"position" in r.data && r.data.position
                  ? ` · ${r.data.position}`
                  : ""}
              </p>
              {r.data.followUp && (
                <p className="followup">
                  <Clock3 size={14} />
                  {tr.followUp}: {r.data.followUp}
                </p>
              )}
              {r.data.url && (
                <ExternalLink url={r.data.url}>{tr.open}</ExternalLink>
              )}
              <p className="prewrap">{r.data.notes}</p>
              {view === "contact" && (
                <>
                  <button
                    className="text-button"
                    onClick={() =>
                      edit("interaction", undefined, {
                        contactId: r.id,
                        date: today(store.settings.timezone),
                      })
                    }
                  >
                    {tr.interaction}
                  </button>
                  {entities(store.records, "interaction")
                    .filter((i) => i.data.contactId === r.id)
                    .sort((a, b) => b.data.date.localeCompare(a.data.date))
                    .map((i) => (
                      <div className="interaction" key={i.id}>
                        <small>{i.data.date}</small>
                        <strong>{i.data.title}</strong>
                        <p>{i.data.body}</p>
                        <EditButton onClick={() => edit("interaction", i)} />
                        <DeleteButton record={i} store={store} />
                      </div>
                    ))}
                </>
              )}
            </div>
            <div className="row-actions">
              <EditButton onClick={() => edit(view, r)} />
              <DeleteButton record={r} store={store} />
            </div>
          </article>
        ))}
        {!rows.length && <Empty action={() => edit(view)} />}
      </div>
    </>
  );
}
