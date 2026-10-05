"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { APP_NAME } from "@/lib/shared/config";
import { BloomMark } from "@/components/brand/bloom-mark/BloomMark";
import { Home } from "@/components/icons/Home";
import { Settings } from "@/components/icons/Settings";
import { AccountMenu } from "@/components/shell/account-menu/AccountMenu";
import { isMockMode } from "@/client/mockMode";
import { useProfileStore } from "@/store/useProfileStore";
import styles from "./AppShell.module.css";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const me = useProfileStore((s) => s.me);
  const [menuOpen, setMenuOpen] = useState(false);
  const initial = (me?.name ?? "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label={`${APP_NAME} home`}>
          <BloomMark size={28} />
          <span className={styles.wordmark}>{APP_NAME}</span>
        </Link>
        <nav aria-label="Primary" className={styles.desktopNav}>
          <Link href="/" data-active={pathname === "/" ? "true" : "false"} className={styles.navLink}>
            Home
          </Link>
          <Link
            href="/settings"
            data-active={pathname.startsWith("/settings") ? "true" : "false"}
            className={styles.navLink}
          >
            Settings
          </Link>
        </nav>
        <div className={styles.right}>
          {isMockMode() ? <span className={styles.mockPill}>Mock data</span> : null}
          <button
            type="button"
            aria-label="Account menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className={styles.avatar}
          >
            {initial}
          </button>
          {menuOpen ? <AccountMenu onClose={() => setMenuOpen(false)} /> : null}
        </div>
      </header>
      <main className={styles.content}>{children}</main>
      <nav aria-label="Primary" className={styles.bottomNav}>
        <Link href="/" data-active={pathname === "/" ? "true" : "false"} className={styles.navItem}>
          <Home size={22} />
          <span>Home</span>
        </Link>
        <Link
          href="/settings"
          data-active={pathname.startsWith("/settings") ? "true" : "false"}
          className={styles.navItem}
        >
          <Settings size={22} />
          <span>Settings</span>
        </Link>
      </nav>
    </>
  );
}
