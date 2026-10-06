"use client";

import { useEffect, useState } from "react";

import { Trash } from "@/components/icons/Trash";
import { Plus } from "@/components/icons/Plus";
import { Button } from "@/components/ui/button/Button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton/Skeleton";
import { NewTokenDialog } from "@/components/settings/shortcuts/new-token-dialog/NewTokenDialog";
import { SetupGuide } from "@/components/settings/shortcuts/setup-guide/SetupGuide";
import { ApiClientError, listShortcutTokens, revokeShortcutToken } from "@/client/apiClient";
import { useAlertStore } from "@/store/useAlertStore";
import type { ShortcutTokenDTO } from "@/types/api";
import styles from "./Shortcuts.module.css";

function prettyDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function Shortcuts() {
  const [tokens, setTokens] = useState<ShortcutTokenDTO[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [revoking, setRevoking] = useState<ShortcutTokenDTO | null>(null);
  const [busyRevoke, setBusyRevoke] = useState(false);

  const refresh = async () => {
    try {
      const result = await listShortcutTokens();
      setTokens(result.tokens);
    } catch (error) {
      if (tokens === null) {
        setTokens([]);
      }
      useAlertStore.getState().addAlert({
        kind: "error",
        message:
          error instanceof ApiClientError ? error.message : "Couldn't load your tokens. Try again?",
      });
    }
  };

  useEffect(() => {
    // Initial load from the token API (external system sync).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRevoke = async () => {
    if (!revoking) return;
    setBusyRevoke(true);
    try {
      await revokeShortcutToken(revoking.id);
      setRevoking(null);
      await refresh();
      useAlertStore.getState().addAlert({ kind: "success", message: "Token revoked" });
    } catch (error) {
      useAlertStore.getState().addAlert({
        kind: "error",
        message: error instanceof ApiClientError ? error.message : "Couldn't revoke that token.",
      });
    } finally {
      setBusyRevoke(false);
    }
  };

  if (tokens === null) {
    return (
      <section aria-label="Shortcuts" className={styles.stack}>
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </section>
    );
  }

  return (
    <section aria-label="Shortcuts" className={styles.stack}>
      <div className={styles.card}>
        <h2 className={styles.heading}>Apple Shortcuts</h2>
        <p className={styles.sub}>
          Use Apple Shortcuts to get a gentle daily reminder on your iPhone. Create a token, then
          follow the setup guide below.
        </p>
        {tokens.length === 0 ? (
          <div className={styles.empty}>
            <Button iconLeft={<Plus size={18} />} onClick={() => setDialogOpen(true)}>
              Create access token
            </Button>
          </div>
        ) : (
          <div className={styles.listActions}>
            <Button
              variant="secondary"
              iconLeft={<Plus size={18} />}
              onClick={() => setDialogOpen(true)}
            >
              Create access token
            </Button>
          </div>
        )}
      </div>

      {tokens.map((token) => (
        <TokenCard key={token.id} token={token} onRevoke={() => setRevoking(token)} />
      ))}

      <SetupGuide defaultOpen={tokens.length === 0} />

      <NewTokenDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={() => {
          setDialogOpen(false);
          void refresh();
          useAlertStore.getState().addAlert({ kind: "success", message: "Token created" });
        }}
      />

      <ConfirmDialog
        open={revoking !== null}
        onClose={() => setRevoking(null)}
        title="Revoke this token?"
        body="Any shortcut using it will stop working."
        confirmLabel="Revoke"
        confirming={busyRevoke}
        onConfirm={() => void handleRevoke()}
      />
    </section>
  );
}

function TokenCard({ token, onRevoke }: { token: ShortcutTokenDTO; onRevoke: () => void }) {
  return (
    <div className={styles.card}>
      <div className={styles.tokenRow}>
        <div>
          <h3 className={styles.tokenLabel}>{token.label}</h3>
          <p className={styles.tokenKey}>bsc_••••••{token.lastFour}</p>
        </div>
        <Button variant="danger" size="sm" iconLeft={<Trash size={16} />} onClick={onRevoke}>
          Revoke
        </Button>
      </div>
      <dl className={styles.meta}>
        <div className={styles.metaRow}>
          <dt>Created</dt>
          <dd>{prettyDate(token.createdAt)}</dd>
        </div>
        <div className={styles.metaRow}>
          <dt>Last used</dt>
          <dd>{token.lastUsedAt ? prettyDate(token.lastUsedAt) : "Never used"}</dd>
        </div>
        <div className={styles.metaRow}>
          <dt>Expires</dt>
          <dd>{token.expiresAt ? prettyDate(token.expiresAt) : "Never expires"}</dd>
        </div>
      </dl>
    </div>
  );
}
