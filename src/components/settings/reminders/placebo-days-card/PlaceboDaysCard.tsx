"use client";

import { useState } from "react";

import { Switch } from "@/components/ui/switch/Switch";
import { useAlertStore } from "@/store/useAlertStore";
import { usePackStore } from "@/store/usePackStore";
import { useProfileStore } from "@/store/useProfileStore";
import styles from "./PlaceboDaysCard.module.css";

export function PlaceboDaysCard() {
  const me = useProfileStore((s) => s.me);
  const updateMe = useProfileStore((s) => s.updateMe);
  const currentPack = usePackStore((s) => s.currentPack)();
  const [busy, setBusy] = useState(false);

  if (!me) {
    return null;
  }

  const checked = me.reminder.onPlaceboDays ?? true;

  const handleToggle = async (next: boolean) => {
    if (busy) {
      return;
    }
    setBusy(true);
    const ok = await updateMe({ reminder: { onPlaceboDays: next } });
    setBusy(false);
    if (ok) {
      useAlertStore.getState().addAlert({ kind: "success", message: "Saved" });
      useAlertStore
        .getState()
        .announce(next ? "Placebo day reminders turned on" : "Placebo day reminders turned off");
    }
  };

  return (
    <div className={styles.card}>
      <h2 className={styles.heading}>Placebo days</h2>
      <div className={styles.switchRow}>
        <p className={styles.label}>Remind me on placebo days too</p>
        <Switch
          checked={checked}
          onChange={(value) => void handleToggle(value)}
          label="Remind me on placebo days too"
          disabled={busy}
        />
      </div>
      <p className={styles.sub}>
        Turn this off if you don&apos;t take anything on placebo days. This applies to browser
        reminders and Apple Shortcuts.
      </p>
      {currentPack && currentPack.placeboDays === 0 ? (
        <p className={styles.hint}>
          Your current pack has no placebo days, so this won&apos;t change anything yet.
        </p>
      ) : null}
    </div>
  );
}
