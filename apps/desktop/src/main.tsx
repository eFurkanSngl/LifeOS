import React from "react";
import { createRoot } from "react-dom/client";
import { LifeOS } from "@lifeos/ui";
import "@lifeos/ui/styles.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LifeOS
      cloudUrl={import.meta.env.VITE_SUPABASE_URL}
      cloudKey={import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}
    />
  </React.StrictMode>,
);
