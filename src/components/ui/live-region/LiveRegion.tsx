"use client";

import { useAlertStore } from "@/store/useAlertStore";

export function LiveRegion() {
  const announcement = useAlertStore((s) => s.announcement);
  return (
    <p aria-live="polite" role="status" className="visually-hidden">
      {announcement}
    </p>
  );
}
