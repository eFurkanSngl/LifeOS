import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { tr } from "./i18n";

export type ThemeMode = "dark" | "light" | "system";
const key = "lifeos-theme-v1";
function readTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(key);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}
function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener("lifeos-theme", notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener("lifeos-theme", notify);
  };
}
export function useTheme() {
  const mode = useSyncExternalStore(
    subscribe,
    readTheme,
    () => "system" as const,
  );
  useEffect(() => {
    const preference = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        mode === "system" ? (preference.matches ? "dark" : "light") : mode;
    };
    apply();
    preference.addEventListener("change", apply);
    return () => preference.removeEventListener("change", apply);
  }, [mode]);
  const setMode = (value: ThemeMode) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Keep the current page usable without storage. */
    }
    window.dispatchEvent(new Event("lifeos-theme"));
  };
  return { mode, setMode };
}
export function ThemePicker({ mode, setMode }: ReturnType<typeof useTheme>) {
  const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : Monitor;
  return (
    <label className="theme-picker">
      <Icon size={16} />
      <select
        aria-label={tr.theme}
        value={mode}
        onChange={(e) => setMode(e.target.value as ThemeMode)}
      >
        <option value="system">{tr.systemTheme}</option>
        <option value="light">{tr.lightTheme}</option>
        <option value="dark">{tr.darkTheme}</option>
      </select>
    </label>
  );
}
