"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button/Button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog/ConfirmDialog";
import { TextField } from "@/components/ui/text-field/TextField";
import { isMockMode, setMockSignedIn } from "@/client/mockMode";
import { useProfileStore } from "@/store/useProfileStore";
import styles from "./Account.module.css";

export function Account() {
  const me = useProfileStore((s) => s.me);
  const deleteAccount = useProfileStore((s) => s.deleteAccount);
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleSignOut = () => {
    if (isMockMode()) {
      setMockSignedIn(false);
      router.replace("/login");
      return;
    }
    signOut({ callbackUrl: "/login" });
  };

  const handleDelete = async () => {
    setDeleting(true);
    const ok = await deleteAccount();
    setDeleting(false);
    if (!ok) {
      return;
    }
    setConfirmOpen(false);
    if (isMockMode()) {
      setMockSignedIn(false);
      router.replace("/register");
      return;
    }
    signOut({ callbackUrl: "/register" });
  };

  return (
    <section aria-label="Account" className={styles.stack}>
      <div className={styles.card}>
        <h2 className={styles.heading}>Account</h2>
        <div className={styles.field}>
          <span className={styles.label}>Email</span>
          <p className={styles.email}>{me?.email ?? ""}</p>
        </div>
        <Button variant="secondary" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
      <div className={`${styles.card} ${styles.danger}`}>
        <h2 className={styles.heading}>Danger zone</h2>
        <p className={styles.dangerText}>
          This permanently deletes your account, packs, and history. Type DELETE to confirm.
        </p>
        <Button variant="danger" onClick={() => setConfirmOpen(true)}>
          Delete account
        </Button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setTyped("");
        }}
        title="Delete your account?"
        body="This permanently deletes your account, packs, and history. Type DELETE to confirm."
        confirmLabel="Delete everything"
        confirming={deleting}
        confirmDisabled={typed !== "DELETE"}
        onConfirm={handleDelete}
      >
        <div className={styles.confirmField}>
          <TextField
            id="delete-confirm"
            label="Type DELETE to confirm"
            type="text"
            autoComplete="off"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
        </div>
      </ConfirmDialog>
    </section>
  );
}
