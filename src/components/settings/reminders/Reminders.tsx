"use client";

import { useState } from "react";

import { Bell } from "@/components/icons/Bell";
import { Clock } from "@/components/icons/Clock";
import { Download } from "@/components/icons/Download";
import { Info } from "@/components/icons/Info";
import { Share } from "@/components/icons/Share";
import { Button } from "@/components/ui/button/Button";
import { Skeleton } from "@/components/ui/skeleton/Skeleton";
import { Switch } from "@/components/ui/switch/Switch";
import { PlaceboDaysCard } from "@/components/settings/reminders/placebo-days-card/PlaceboDaysCard";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { usePushReminders } from "@/hooks/usePushReminders";
import { useAlertStore } from "@/store/useAlertStore";
import { useProfileStore } from "@/store/useProfileStore";
import styles from "./Reminders.module.css";

const QUICK_TIMES = [
  { label: "8:00 am", value: "08:00" },
  { label: "12:00 pm", value: "12:00" },
  { label: "8:00 pm", value: "20:00" },
  { label: "10:00 pm", value: "22:00" },
];

export function Reminders() {
  const me = useProfileStore((s) => s.me);
  const status = useProfileStore((s) => s.status);
  const updateMe = useProfileStore((s) => s.updateMe);
  const { support, permission, isSubscribed, busy, enable, disable, sendTest } =
    usePushReminders();
  const { canInstall, promptInstall, isStandalone, isIos } = useInstallPrompt();
  const [time, setTime] = useState<string | null>(null);
  const [savingTime, setSavingTime] = useState(false);

  if (!me || status === "loading") {
    return (
      <section aria-label="Reminders" className={styles.card}>
        <Skeleton variant="title" />
        <Skeleton variant="text" />
        <Skeleton variant="button" />
      </section>
    );
  }

  const currentTime = time ?? me.reminder.time;
  const reminderOn = me.reminder.enabled;

  const handleToggle = (checked: boolean) => {
    if (checked) {
      void enable(currentTime);
    } else {
      void disable();
    }
  };

  const handleTimeChange = async (value: string) => {
    setTime(value);
    if (!reminderOn || !isSubscribed) {
      return;
    }
    setSavingTime(true);
    const ok = await updateMe({ reminder: { time: value } });
    setSavingTime(false);
    if (ok) {
      useAlertStore.getState().addAlert({ kind: "success", message: "Saved" });
    }
  };

  return (
    <section aria-label="Reminders" className={styles.stack}>
      <div className={styles.card}>
        <div className={styles.switchRow}>
          <div>
            <h2 className={styles.heading}>Daily reminder</h2>
            <p className={styles.sub}>A gentle nudge at the same time each day.</p>
          </div>
          <Switch
            checked={reminderOn && isSubscribed}
            onChange={handleToggle}
            label="Daily reminder"
            disabled={busy || support !== "ok"}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="reminder-time" className={styles.label}>
            Reminder time
          </label>
          <input
            id="reminder-time"
            type="time"
            value={currentTime}
            onChange={(e) => void handleTimeChange(e.target.value)}
            disabled={savingTime}
            className={styles.timeInput}
          />
        </div>
        <div className={styles.chips}>
          {QUICK_TIMES.map((option) => (
            <button
              key={option.value}
              type="button"
              data-active={currentTime === option.value ? "true" : "false"}
              onClick={() => void handleTimeChange(option.value)}
              className={styles.chip}
            >
              {option.label}
            </button>
          ))}
        </div>
        <StatusBlock support={support} permission={permission} />
        <div className={styles.actions}>
          <Button variant="secondary" disabled={busy || !isSubscribed} onClick={() => void sendTest()}>
            Send a test
          </Button>
        </div>
        {me.pushDeviceCount > 0 ? (
          <div className={styles.devices}>
            <p>
              Reminders are on for {me.pushDeviceCount}{" "}
              {me.pushDeviceCount === 1 ? "device" : "devices"}
            </p>
            <Button variant="ghost" disabled={busy || !isSubscribed} onClick={() => void disable()}>
              Turn off on this device
            </Button>
          </div>
        ) : null}
      </div>
      <PlaceboDaysCard />
      {!isStandalone ? (
        <div className={styles.card}>
          <h2 className={styles.heading}>Install Bloome</h2>
          {canInstall ? (
            <Button
              variant="secondary"
              iconLeft={<Download size={18} />}
              onClick={() => void promptInstall()}
            >
              Install Bloome
            </Button>
          ) : null}
          {isIos ? (
            <div className={styles.iosSteps}>
              <Share size={20} />
              <p>
                On iPhone, add Bloome to your Home Screen first (Share, then Add to Home Screen).
                Then you can turn reminders on.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function StatusBlock({
  support,
  permission,
}: {
  support: "ok" | "unsupported" | "ios-needs-install";
  permission: NotificationPermission | null;
}) {
  if (support === "unsupported") {
    return (
      <p role="status" className={styles.status}>
        <Info size={16} />
        This browser can&apos;t show reminders. Try Chrome, Edge, Firefox, or Safari on your
        Home Screen.
      </p>
    );
  }
  if (support === "ios-needs-install") {
    return (
      <p role="status" className={styles.status}>
        <Share size={16} />
        On iPhone, add Bloome to your Home Screen first (Share, then Add to Home Screen). Then
        you can turn reminders on.
      </p>
    );
  }
  if (permission === "denied") {
    return (
      <p role="status" className={styles.status}>
        <Bell size={16} />
        Notifications are blocked for this site. Allow them in your browser settings, then come
        back.
      </p>
    );
  }
  if (permission === "default") {
    return (
      <p role="status" className={styles.status}>
        <Clock size={16} />
        Turn the switch on and your browser will ask for permission.
      </p>
    );
  }
  return null;
}
