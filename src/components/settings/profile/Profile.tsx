"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button/Button";
import { TextField } from "@/components/ui/text-field/TextField";
import { Skeleton } from "@/components/ui/skeleton/Skeleton";
import { useAlertStore } from "@/store/useAlertStore";
import { useProfileStore } from "@/store/useProfileStore";
import styles from "./Profile.module.css";

function detectedTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

function timezoneOptions(): string[] {
  const detected = detectedTimezone();
  let all: string[] = [];
  try {
    const supported = Intl.supportedValuesOf("timeZone");
    if (Array.isArray(supported) && supported.length > 0) {
      all = supported;
    }
  } catch {
    all = [];
  }
  if (all.length === 0) {
    all = [detected, "UTC", "Africa/Lagos", "Europe/London", "America/New_York"];
  }
  return [detected, ...all.filter((z) => z !== detected)];
}

export function Profile() {
  const me = useProfileStore((s) => s.me);
  const status = useProfileStore((s) => s.status);
  const updateMe = useProfileStore((s) => s.updateMe);
  const [name, setName] = useState(me?.name ?? "");
  const [timezone, setTimezone] = useState(me?.timezone ?? detectedTimezone());
  const [lastId, setLastId] = useState<string | null>(me?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();

  // Pick up freshly loaded profile values during render (never in an effect).
  if (me && me.id !== lastId) {
    setLastId(me.id);
    setName(me.name);
    setTimezone(me.timezone);
  }

  if (!me || status === "loading") {
    return (
      <section aria-label="Profile" className={styles.card}>
        <Skeleton variant="title" />
        <Skeleton variant="text" />
        <Skeleton variant="button" />
      </section>
    );
  }

  const dirty = name.trim() !== me.name || timezone !== me.timezone;

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 60) {
      setNameError("Name is required");
      document.getElementById("profile-name")?.focus();
      return;
    }
    setNameError(undefined);
    setSaving(true);
    const ok = await updateMe({ name: trimmed, timezone });
    setSaving(false);
    if (ok) {
      useAlertStore.getState().addAlert({ kind: "success", message: "Saved" });
    }
  };

  return (
    <section aria-label="Profile" className={styles.card}>
      <h2 className={styles.heading}>Profile</h2>
      <TextField
        id="profile-name"
        label="Name"
        type="text"
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={nameError}
      />
      <div className={styles.field}>
        <label htmlFor="profile-timezone" className={styles.label}>
          Timezone
        </label>
        <select
          id="profile-timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className={styles.select}
        >
          {timezoneOptions().map((zone, index) => (
            <option key={zone} value={zone}>
              {index === 0 ? `${zone} (Detected)` : zone}
            </option>
          ))}
        </select>
      </div>
      <Button onClick={handleSave} loading={saving} disabled={!dirty}>
        Save
      </Button>
    </section>
  );
}
