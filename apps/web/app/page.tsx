"use client";
import { LifeOS } from "@lifeos/ui";
export default function Page() {
  return (
    <LifeOS
      cloudUrl={process.env.NEXT_PUBLIC_SUPABASE_URL}
      cloudKey={process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}
    />
  );
}
