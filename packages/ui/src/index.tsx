"use client";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare2,
  Layers3,
  BriefcaseBusiness,
  Repeat2,
  Flame,
  Lightbulb,
  Plug,
  Settings2,
  Search,
  Plus,
  Bell,
  PanelRightClose,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
  Terminal,
  ArrowUpRight,
  Command,
  X,
  ChevronRight,
  BookOpen,
  Code2,
} from "lucide-react";
import { motion, MotionConfig } from "motion/react";
import { type Entity, type Kind, entities, SETTINGS_ID } from "@lifeos/core";
import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { tr, label } from "./i18n";
import { useLife } from "./store";
import { RecordForm, Modal } from "./components";
import { Dashboard, Reminders } from "./dashboard";
import {
  TaskList,
  Planner,
  Projects,
  Habits,
  Career,
  Ideas,
  FocusPanel,
  type Edit,
} from "./features";
import { openLink } from "./native";
import { Settings, Integrations } from "./settings";

const nav = [
  ["dashboard", LayoutDashboard],
  ["planner", CalendarDays],
  ["tasks", CheckSquare2],
  ["projects", Layers3],
  ["career", BriefcaseBusiness],
  ["habits", Repeat2],
  ["focus", Flame],
  ["ideas", Lightbulb],
  ["integrations", Plug],
] as const;
export function LifeOS({
  cloudUrl,
  cloudKey,
}: {
  cloudUrl?: string;
  cloudKey?: string;
}) {
  const store = useLife(cloudUrl, cloudKey),
    [page, setPage] = useState("dashboard"),
    [search, setSearch] = useState(""),
    [sidebar, setSidebar] = useState(true),
    [workspace, setWorkspace] = useState(true),
    [editing, setEditing] = useState<{
      kind: Kind;
      record?: Entity;
      initial?: Record<string, unknown>;
    } | null>(null),
    [notifications, setNotifications] = useState(false),
    [history, setHistory] = useState(false),
    [capture, setCapture] = useState(""),
    [now, setNow] = useState(new Date()),
    [online, setOnline] = useState(true);
  const edit: Edit = (kind, record, initial) =>
    setEditing({ kind, record, initial });
  useEffect(() => {
    if (!isTauri()) return;
    let active = true;
    let dispose: (() => void) | undefined;
    void listen<string>("open-reminder", async (event) => {
      try {
        const record = (await store.service().list()).find(
          (r) => r.id === event.payload && r.kind === "reminder" && !r.deleted,
        );
        if (record) setEditing({ kind: "reminder", record });
      } catch (error) {
        store.setError(String(error));
      }
    })
      .then((stop) => {
        if (active) dispose = stop;
        else stop();
      })
      .catch((error) => store.setError(String(error)));
    return () => {
      active = false;
      dispose?.();
    };
  }, []);
  const navigate = (value: string) => {
    setPage(value);
    setSearch("");
    window.location.hash = value;
  };
  useEffect(() => {
    const value = window.location.hash.slice(1);
    if (
      [...nav.map(([id]) => id), "settings"].includes(
        value as (typeof nav)[number][0],
      )
    )
      setPage(value);
    const onHash = () => {
      const id = window.location.hash.slice(1);
      if (
        [...nav.map(([key]) => key), "settings"].includes(
          id as (typeof nav)[number][0],
        )
      )
        setPage(id);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 30000);
    const connect = () => setOnline(navigator.onLine);
    connect();
    window.addEventListener("online", connect);
    window.addEventListener("offline", connect);
    const keys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("global-search")?.focus();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "a"
      ) {
        e.preventDefault();
        setEditing({ kind: "task" });
      }
    };
    window.addEventListener("keydown", keys);
    return () => {
      clearInterval(tick);
      window.removeEventListener("online", connect);
      window.removeEventListener("offline", connect);
      window.removeEventListener("keydown", keys);
    };
  }, []);
  const shortcuts = entities(store.records, "shortcut")
      .filter((s) =>
        s.data.title
          .toLocaleLowerCase("tr")
          .includes(search.toLocaleLowerCase("tr")),
      )
      .sort(
        (a, b) =>
          Number(b.data.pinned) - Number(a.data.pinned) ||
          a.data.order - b.data.order,
      ),
    sessions = entities(store.records, "codex");
  const currentKind: Kind =
    page === "projects"
      ? "project"
      : page === "career"
        ? "contact"
        : page === "habits"
          ? "habit"
          : page === "ideas"
            ? "note"
            : page === "integrations"
              ? "shortcut"
              : "task";
  if (!store.ready)
    return (
      <div className="loading-screen">
        <div className="brand-icon">L</div>
        <p>{store.error || tr.loading}</p>
        <div className="skeleton" />
        <div className="skeleton short" />
        {store.error && (
          <button
            className="button secondary"
            onClick={() => window.location.reload()}
          >
            {tr.undo}
          </button>
        )}
      </div>
    );
  return (
    <MotionConfig reducedMotion="user">
      <div
        className={`app-shell ${sidebar ? "" : "sidebar-collapsed"} ${workspace ? "" : "workspace-collapsed"}`}
      >
        <aside className="sidebar">
          <a
            className="brand"
            href="#dashboard"
            onClick={() => navigate("dashboard")}
          >
            <span className="brand-icon">
              L<span />
            </span>
            {sidebar && (
              <span>
                Life<span>OS</span>
              </span>
            )}
          </a>
          <button
            className="sidebar-toggle icon-button"
            onClick={() => setSidebar(!sidebar)}
            aria-label={sidebar ? tr.collapse : tr.expand}
          >
            {sidebar ? (
              <PanelLeftClose size={17} />
            ) : (
              <PanelLeftOpen size={17} />
            )}
          </button>
          <nav aria-label={tr.workspace}>
            {nav.map(([id, Icon]) => (
              <button
                key={id}
                className={`nav-item ${page === id ? "active" : ""}`}
                aria-current={page === id ? "page" : undefined}
                title={label(id)}
                onClick={() => navigate(id)}
              >
                <Icon size={19} />
                {sidebar && <span>{label(id)}</span>}
                {id === "tasks" && sidebar && (
                  <small>
                    {
                      entities(store.records, "task").filter(
                        (t) =>
                          !t.data.recurrence &&
                          !t.data.archived &&
                          t.data.status === "inbox",
                      ).length
                    }
                  </small>
                )}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            {sidebar && (
              <div className="privacy-note">
                <div className="privacy-mark">◈</div>
                <p>
                  {tr.security}
                  <small>{tr.localHint}</small>
                </p>
              </div>
            )}
            <button
              className={`nav-item ${page === "settings" ? "active" : ""}`}
              title={tr.settings}
              onClick={() => navigate("settings")}
            >
              <Settings2 size={19} />
              {sidebar && tr.settings}
            </button>
            <div className="profile">
              <div className="avatar">A</div>
              {sidebar && (
                <div>
                  <strong>{tr.workspace}</strong>
                  <small>{isTauri() ? tr.native : tr.local}</small>
                </div>
              )}
            </div>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="breadcrumb">
              LifeOS
              <ChevronRight size={14} />
              <strong>{label(page)}</strong>
            </div>
            <div className="search">
              <Search size={16} />
              <input
                id="global-search"
                aria-label={tr.search}
                placeholder={tr.search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <kbd>Ctrl K</kbd>
            </div>
            <div className="topbar-actions">
              <span className="top-date">
                {now.toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "short",
                  timeZone: store.settings.timezone,
                })}
              </span>
              <button
                className="icon-button notification-button"
                aria-label={tr.reminders}
                onClick={() => setNotifications(true)}
              >
                <Bell size={19} />
                {entities(store.records, "reminder").some(
                  (r) => r.data.status === "pending",
                ) && <i />}
              </button>
              <button
                className="button primary quick-add"
                title="Ctrl Shift A"
                onClick={() => edit(currentKind)}
              >
                <Plus size={16} />
                <span>{tr.quickAdd}</span>
              </button>
              <button
                className="icon-button workspace-toggle"
                aria-label={workspace ? tr.collapse : tr.expand}
                onClick={() => setWorkspace(!workspace)}
              >
                <PanelRightClose size={18} />
              </button>
            </div>
          </header>
          <div className="content-layout">
            <main id="main-content">
              <div className="status-line">
                <span>
                  <i className={`status-dot ${online ? "" : "offline"}`} />
                  {online ? tr.local : tr.offline}
                </span>
                <span>
                  {now.toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: store.settings.timezone,
                  })}{" "}
                  <small>{store.settings.timezone}</small>
                </span>
              </div>
              {store.error && (
                <div className="error-banner" role="alert">
                  <span>{store.error}</span>
                  <button
                    aria-label={tr.cancel}
                    className="icon-button"
                    onClick={() => store.setError("")}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              {page !== "dashboard" && (
                <div className="page-heading">
                  <div>
                    <h1>{label(page)}</h1>
                    <p>
                      {page === "settings"
                        ? tr.settingsHint
                        : page === "focus"
                          ? tr.focusHint
                          : tr.tagline}
                    </p>
                  </div>
                  {!["settings", "focus", "career"].includes(page) && (
                    <button
                      className="button primary"
                      onClick={() => edit(currentKind)}
                    >
                      <Plus size={16} />
                      {tr.new}
                    </button>
                  )}
                </div>
              )}
              {search && (
                <div className="search-results">
                  <h3>
                    {tr.search.replace("…", "")} · {search}
                  </h3>
                  {store.records
                    .filter(
                      (r) =>
                        !r.deleted &&
                        r.kind !== "settings" &&
                        `${r.data.title ?? ""} ${r.data.body ?? ""} ${r.data.description ?? ""}`
                          .toLocaleLowerCase("tr")
                          .includes(search.toLocaleLowerCase("tr")),
                    )
                    .slice(0, 15)
                    .map((r) => (
                      <button key={r.id} onClick={() => edit(r.kind, r)}>
                        {String(r.data.title ?? r.kind)}
                        <span>{r.kind}</span>
                      </button>
                    ))}
                </div>
              )}
              <motion.div
                key={page}
                initial={false}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
              >
                {page === "dashboard" ? (
                  <Dashboard store={store} edit={edit} navigate={navigate} />
                ) : page === "tasks" ? (
                  <TaskList store={store} edit={edit} search={search} />
                ) : page === "planner" ? (
                  <Planner store={store} edit={edit} />
                ) : page === "projects" ? (
                  <Projects store={store} edit={edit} search={search} />
                ) : page === "habits" ? (
                  <Habits store={store} edit={edit} search={search} />
                ) : page === "career" ? (
                  <Career store={store} edit={edit} search={search} />
                ) : page === "ideas" ? (
                  <Ideas store={store} edit={edit} search={search} />
                ) : page === "focus" ? (
                  <FocusPanel store={store} />
                ) : page === "settings" ? (
                  <Settings
                    store={store}
                    edit={(kind, record, initial) =>
                      edit(
                        kind,
                        record ??
                          (kind === "settings"
                            ? {
                                id: SETTINGS_ID,
                                kind: "settings",
                                data: store.settings,
                                version: 0,
                                cloudVersion: 0,
                                dirty: true,
                                deleted: false,
                                updatedAt: new Date().toISOString(),
                              }
                            : undefined),
                        initial,
                      )
                    }
                  />
                ) : (
                  <Integrations store={store} edit={edit} search={search} />
                )}
              </motion.div>
              <footer className="main-footer">
                <span>
                  LifeOS <span className="muted">/ {tr.tagline}</span>
                </span>
                <span>
                  <Command size={12} /> Ctrl Shift A{" "}
                  <span className="muted">{tr.quickAdd}</span>
                </span>
              </footer>
            </main>
            {workspace && (
              <aside className="workspace">
                <div className="workspace-heading">
                  <h2>{tr.workspace}</h2>
                  <button
                    className="icon-button"
                    aria-label={tr.collapse}
                    onClick={() => setWorkspace(false)}
                  >
                    <PanelRightClose size={17} />
                  </button>
                </div>
                <section className="workspace-section">
                  <div className="section-heading">
                    <h3>
                      <MessageSquare size={16} />
                      {tr.chatgpt}
                    </h3>
                    <button
                      className="icon-button"
                      aria-label={tr.new + " " + tr.chatgpt}
                      onClick={() => edit("shortcut")}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <p>{tr.shortcutsHint}</p>
                  <div className="shortcut-list">
                    {shortcuts.map((s) => {
                      const Icon =
                        s.data.icon === "code"
                          ? Code2
                          : s.data.icon === "book"
                            ? BookOpen
                            : MessageSquare;
                      return (
                        <a
                          key={s.id}
                          href={s.data.url}
                          onClick={(e) =>
                            openLink(e, s.data.url, store.setError)
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shortcut"
                        >
                          <span className={`shortcut-icon ${s.data.color}`}>
                            <Icon size={16} />
                          </span>
                          <span>{s.data.title}</span>
                          <ArrowUpRight size={14} />
                        </a>
                      );
                    })}
                    {!shortcuts.length && (
                      <button
                        className="workspace-empty"
                        onClick={() => edit("shortcut")}
                      >
                        <Plus size={16} />
                        {tr.new}
                      </button>
                    )}
                  </div>
                </section>
                <section className="workspace-section">
                  <div className="section-heading">
                    <h3>
                      <Terminal size={16} />
                      {tr.codex}
                    </h3>
                    <button
                      className="icon-button"
                      aria-label={tr.new + " " + tr.codex}
                      onClick={() => edit("codex")}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <p>{tr.codexHint}</p>
                  {sessions.map((s) => (
                    <button
                      key={s.id}
                      className="session-link"
                      onClick={() => edit("codex", s)}
                    >
                      <span className="terminal-mark">
                        <Terminal size={16} />
                      </span>
                      <span>
                        {s.data.title}
                        <small>
                          {entities(store.records, "project").find(
                            (p) => p.id === s.data.projectId,
                          )?.data.title ?? s.data.reference}
                        </small>
                      </span>
                      <ArrowUpRight size={14} />
                    </button>
                  ))}
                  {!sessions.length && (
                    <button
                      className="workspace-empty"
                      onClick={() => edit("codex")}
                    >
                      <Plus size={16} />
                      {tr.new}
                    </button>
                  )}
                  <div className="mcp-status">
                    <span
                      className={`status-dot ${store.settings.mcpEnabled ? "" : "offline"}`}
                    />
                    <span>MCP</span>
                    <button onClick={() => navigate("settings")}>
                      {tr.settings}
                      <ArrowUpRight size={12} />
                    </button>
                  </div>
                </section>
                <section className="workspace-section capture-section">
                  <div className="section-heading">
                    <h3>
                      <Lightbulb size={16} />
                      {tr.quickNote}
                    </h3>
                    <span className="badge">
                      {
                        entities(store.records, "note").filter(
                          (n) => !n.data.archived,
                        ).length
                      }
                    </span>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!capture.trim()) return;
                      void store
                        .save("note", {
                          title: capture.trim().split("\n")[0].slice(0, 240),
                          body: capture,
                          category: tr.inbox,
                        })
                        .then((r) => {
                          if (r) setCapture("");
                        });
                    }}
                  >
                    <textarea
                      aria-label={tr.quickNote}
                      placeholder={tr.quickNoteHint}
                      value={capture}
                      onChange={(e) => setCapture(e.target.value)}
                      rows={4}
                    />
                    <button
                      className="button secondary"
                      disabled={!capture.trim()}
                    >
                      {tr.capture}
                      <Plus size={14} />
                    </button>
                  </form>
                  {entities(store.records, "note")
                    .filter((n) => !n.data.archived)
                    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                    .slice(0, 3)
                    .map((n) => (
                      <button
                        className="note-preview"
                        key={n.id}
                        onClick={() => edit("note", n)}
                      >
                        <span />
                        {n.data.title}
                        <ArrowUpRight size={13} />
                      </button>
                    ))}
                </section>
                <div className="workspace-footer">
                  <span className="small-logo">L</span>
                  <p>
                    {tr.tagline}
                    <small>{tr.security}</small>
                  </p>
                </div>
              </aside>
            )}
          </div>
        </div>
        {editing && (
          <RecordForm
            kind={editing.kind}
            record={editing.record?.version === 0 ? undefined : editing.record}
            initial={
              editing.kind === "settings"
                ? { ...store.settings, ...editing.initial }
                : editing.initial
            }
            store={store}
            onClose={() => setEditing(null)}
          />
        )}
        {notifications && (
          <Modal title={tr.reminders} onClose={() => setNotifications(false)}>
            <div className="toolbar">
              <button
                className="text-button"
                onClick={() => setHistory(!history)}
              >
                {history ? tr.reminders : tr.notificationHistory}
              </button>
              <button
                className="button primary"
                onClick={() => {
                  setNotifications(false);
                  edit("reminder");
                }}
              >
                <Plus size={15} />
                {tr.new}
              </button>
            </div>
            <Reminders
              store={store}
              edit={(...args) => {
                setNotifications(false);
                edit(...args);
              }}
              history={history}
            />
            <p className="delivery-hint">
              {isTauri() ? tr.nativeHint : tr.desktopOnly}
            </p>
          </Modal>
        )}
        {store.toast && (
          <div className="toast" role="status">
            {store.toast}
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
