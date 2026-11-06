import { useEffect, useState } from "react";
import { tr } from "./i18n";
export function WorkspaceResize() {
  const [width, setWidth] = useState(294);
  const apply = (n: number) => {
    const value = Math.max(238, Math.min(440, n));
    setWidth(value);
    document.documentElement.style.setProperty(
      "--workspace-width",
      `${value}px`,
    );
    try {
      localStorage.setItem("lifeos-workspace-width", String(value));
    } catch {
      /* Layout preference is optional. */
    }
  };
  useEffect(() => {
    const n = Number(localStorage.getItem("lifeos-workspace-width"));
    if (Number.isFinite(n) && n >= 238 && n <= 440) apply(n);
  }, []);
  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={tr.resizeWorkspace}
      aria-orientation="vertical"
      aria-valuemin={238}
      aria-valuemax={440}
      aria-valuenow={width}
      className="workspace-resize"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          apply(width + (e.key === "ArrowLeft" ? 16 : -16));
        }
      }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId))
          apply(window.innerWidth - e.clientX);
      }}
      onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
    />
  );
}
