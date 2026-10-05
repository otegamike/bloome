"use client";

import { Button } from "@/components/ui/button/Button";
import { usePrefsStore } from "@/store/usePrefsStore";
import { useProfileStore } from "@/store/useProfileStore";
import { useCalendarStore } from "@/store/useCalendarStore";
import styles from "./TimezoneBanner.module.css";

function browserTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

export function TimezoneBanner() {
  const me = useProfileStore((s) => s.me);
  const updateMe = useProfileStore((s) => s.updateMe);
  const dismissed = usePrefsStore((s) => s.dismissedTimezone);
  const dismissTimezone = usePrefsStore((s) => s.dismissTimezone);
  const invalidateAll = useCalendarStore((s) => s.invalidateAll);

  const browser = browserTimezone();
  if (!me || !browser || me.timezone === browser || dismissed.includes(browser)) {
    return null;
  }

  const handleUpdate = async () => {
    const ok = await updateMe({ timezone: browser });
    if (ok) {
      invalidateAll();
    }
  };

  return (
    <div role="status" className={styles.banner}>
      <p>
        Your device is on {browser} but Bloome is set to {me.timezone}.
      </p>
      <div className={styles.actions}>
        <Button size="sm" onClick={() => void handleUpdate()}>
          Update
        </Button>
        <Button size="sm" variant="ghost" onClick={() => dismissTimezone(browser)}>
          Not now
        </Button>
      </div>
    </div>
  );
}
