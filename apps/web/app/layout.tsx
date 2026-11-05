import type { Metadata } from "next";
import "@lifeos/ui/styles.css";
export const metadata: Metadata = {
  title: "LifeOS — Kişisel çalışma alanın",
  description: "Gününü planla. Düşüncelerine yer aç.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
