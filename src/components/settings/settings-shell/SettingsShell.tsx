"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell/AppShell";
import { Profile } from "@/components/settings/profile/Profile";
import { Appearance } from "@/components/settings/appearance/Appearance";
import { Account } from "@/components/settings/account/Account";
import { Reminders } from "@/components/settings/reminders/Reminders";
import { Packs } from "@/components/settings/packs/Packs";
import styles from "./SettingsShell.module.css";

const TABS = [
  { value: "profile", label: "Profile" },
  { value: "packs", label: "Packs" },
  { value: "reminders", label: "Reminders" },
  { value: "appearance", label: "Appearance" },
  { value: "account", label: "Account" },
] as const;

export type SettingsTab = (typeof TABS)[number]["value"];

function isTab(value: string | null): value is SettingsTab {
  return TABS.some((t) => t.value === value);
}

export function SettingsShell() {
  return (
    <Suspense>
      <SettingsShellInner />
    </Suspense>
  );
}

function SettingsShellInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get("tab");
  const active: SettingsTab = isTab(raw) ? raw : "profile";

  const select = (tab: SettingsTab) => {
    router.replace(`/settings?tab=${tab}`);
  };

  return (
    <AppShell>
      <div className={styles.layout}>
        <h1 className={styles.title}>Settings</h1>
        <div role="tablist" aria-label="Settings sections" className={styles.tabs}>
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active === tab.value}
              data-active={active === tab.value ? "true" : "false"}
              onClick={() => select(tab.value)}
              className={styles.tab}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" className={styles.panel}>
          {active === "profile" ? <Profile /> : null}
          {active === "appearance" ? <Appearance /> : null}
          {active === "account" ? <Account /> : null}
          {active === "reminders" ? <Reminders /> : null}
          {active === "packs" ? <Packs /> : null}
        </div>
      </div>
    </AppShell>
  );
}
