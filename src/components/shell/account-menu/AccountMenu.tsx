"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

import { isMockMode, setMockSignedIn } from "@/client/mockMode";
import styles from "./AccountMenu.module.css";

export function AccountMenu({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const handleSignOut = () => {
    if (isMockMode()) {
      setMockSignedIn(false);
      onClose();
      router.replace("/login");
      return;
    }
    signOut({ callbackUrl: "/login" });
  };

  return (
    <div ref={ref} role="menu" aria-label="Account" className={styles.menu}>
      <Link href="/settings" role="menuitem" onClick={onClose} className={styles.item}>
        Settings
      </Link>
      <button type="button" role="menuitem" onClick={handleSignOut} className={styles.item}>
        Sign out
      </button>
    </div>
  );
}
