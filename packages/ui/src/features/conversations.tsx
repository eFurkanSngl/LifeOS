import { useMemo, useState } from "react";
import {
  Copy,
  Link2,
  MessageSquare,
  Terminal,
  ShieldCheck,
} from "lucide-react";
import { entities } from "@lifeos/core";
import {
  Section,
  Empty,
  EditButton,
  DeleteButton,
  ExternalLink,
} from "../components";
import { tr } from "../i18n";
import type { LifeStore } from "../store";
import type { Edit } from "./types";

export function Integrations({
  store,
  edit,
  search,
  conversationsOnly = false,
}: {
  store: LifeStore;
  edit: Edit;
  search: string;
  conversationsOnly?: boolean;
}) {
  const [source, setSource] = useState("all");
  const [chatLimit, setChatLimit] = useState(40);
  const [sessionLimit, setSessionLimit] = useState(40);
  const { shortcuts, sessions } = useMemo(() => {
    const query = search.toLocaleLowerCase("tr");
    return {
      shortcuts: entities(store.records, "shortcut")
        .filter((s) => s.data.title.toLocaleLowerCase("tr").includes(query))
        .sort(
          (a, b) =>
            Number(b.data.pinned) - Number(a.data.pinned) ||
            a.data.order - b.data.order,
        ),
      sessions: entities(store.records, "codex").filter((s) =>
        `${s.data.title} ${s.data.reference}`
          .toLocaleLowerCase("tr")
          .includes(query),
      ),
    };
  }, [store.records, search]);
  return (
    <>
      {!conversationsOnly && (
        <div className="provider-grid connection-grid">
          <div className="panel provider">
            <MessageSquare size={21} />
            <h3>ChatGPT</h3>
            <p>{tr.chatgptConnectionHint}</p>
            <span className="badge blue">
              {shortcuts.length} {tr.chatCount}
            </span>
          </div>
          <div className="panel provider">
            <Terminal size={21} />
            <h3>Codex</h3>
            <p>{tr.codexConnectionHint}</p>
            <span
              className={`badge ${store.settings.mcpEnabled ? "green" : ""}`}
            >
              MCP {store.settings.mcpEnabled ? tr.active : tr.local}
            </span>
          </div>
          <div className="panel provider">
            <ShieldCheck size={21} />
            <h3>Supabase</h3>
            <p>{tr.cloudConnectionHint}</p>
            <span className="badge">
              {store.cloud ? tr.account : tr.cloudMissing}
            </span>
          </div>
        </div>
      )}
      <div className="conversation-toolbar">
        <div className="source-tabs" role="group" aria-label={tr.chats}>
          {[
            ["all", tr.all],
            ["chatgpt", "ChatGPT"],
            ["codex", "Codex"],
          ].map(([id, title]) => (
            <button
              key={id}
              className={source === id ? "selected" : ""}
              aria-pressed={source === id}
              onClick={() => setSource(id)}
            >
              {title}
              <span>
                {id === "all"
                  ? shortcuts.length + sessions.length
                  : id === "chatgpt"
                    ? shortcuts.length
                    : sessions.length}
              </span>
            </button>
          ))}
        </div>
        <span className="muted">{tr.importedChatHint}</span>
      </div>
      <div
        className={`conversation-collections ${source !== "all" ? "single-source" : ""}`}
      >
        {source !== "codex" && (
          <div className="conversation-collection">
            <Section
              title={tr.chatgpt}
              sub={tr.chatgptConnectionHint}
              action={
                <button
                  className="button secondary"
                  onClick={() => edit("shortcut")}
                >
                  {tr.new}
                </button>
              }
            >
              <div className="conversation-rows">
                {shortcuts.length ? (
                  shortcuts.slice(0, chatLimit).map((s) => (
                    <div className="simple-row conversation-row" key={s.id}>
                      <span className={`shortcut-icon ${s.data.color}`}>
                        <MessageSquare size={17} />
                      </span>
                      <ExternalLink url={s.data.url}>
                        {s.data.title}
                      </ExternalLink>
                      <span className="spacer" />
                      <EditButton onClick={() => edit("shortcut", s)} />
                      <DeleteButton record={s} store={store} />
                    </div>
                  ))
                ) : (
                  <Empty action={() => edit("shortcut")} />
                )}
              </div>
            </Section>
            <div className="collection-footer">
              <span>
                {Math.min(chatLimit, shortcuts.length)} / {shortcuts.length}{" "}
                {tr.chatCount}
              </span>
              {shortcuts.length > chatLimit && (
                <button
                  className="text-button"
                  onClick={() => setChatLimit((n) => n + 40)}
                >
                  {tr.moreChats}
                </button>
              )}
            </div>
          </div>
        )}
        {source !== "chatgpt" && (
          <div className="conversation-collection">
            <Section
              title={tr.codex}
              sub={tr.codexHistoryHint}
              action={
                <button
                  className="button secondary"
                  onClick={() => edit("codex")}
                >
                  {tr.new}
                </button>
              }
            >
              <div className="conversation-rows">
                {sessions.length ? (
                  sessions.slice(0, sessionLimit).map((s) => (
                    <div className="simple-row conversation-row" key={s.id}>
                      <span className="terminal-mark">
                        <Terminal size={17} />
                      </span>
                      <span className="chat-session-title" title={s.data.title}>
                        <button
                          className="conversation-title"
                          onClick={() => edit("codex", s)}
                        >
                          {s.data.title}
                        </button>
                        <small>{s.data.reference}</small>
                      </span>
                      <button
                        className="icon-button"
                        aria-label={`${tr.copyReference}: ${s.data.title}`}
                        title={tr.copyReference}
                        onClick={() =>
                          void store.run(async () => {
                            await navigator.clipboard.writeText(
                              s.data.reference,
                            );
                            store.notify(tr.referenceCopied);
                          })
                        }
                      >
                        <Copy size={16} />
                      </button>
                      {s.data.url && (
                        <ExternalLink url={s.data.url}>
                          <Link2 size={15} />
                        </ExternalLink>
                      )}
                      <EditButton onClick={() => edit("codex", s)} />
                      <DeleteButton record={s} store={store} />
                    </div>
                  ))
                ) : (
                  <Empty action={() => edit("codex")} />
                )}
              </div>
            </Section>
            <div className="collection-footer">
              <span>
                {Math.min(sessionLimit, sessions.length)} / {sessions.length}{" "}
                {tr.chatCount}
              </span>
              {sessions.length > sessionLimit && (
                <button
                  className="text-button"
                  onClick={() => setSessionLimit((n) => n + 40)}
                >
                  {tr.moreChats}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
