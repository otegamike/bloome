"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button/Button";
import type { MobilePairingApproveResponse } from "@/types/api";
import type { MobilePairingSummary, MobilePairingView } from "@/types/MobileAuth";
import styles from "./MobileAuthorize.module.css";

interface MobileAuthorizeProps {
  pairingId: string | null;
  summary: MobilePairingSummary;
}

async function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function readError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: unknown } | null;
  return typeof data?.error === "string" ? data.error : "Something went wrong. Try again?";
}

export function MobileAuthorize({ pairingId, summary }: MobileAuthorizeProps) {
  const [status, setStatus] = useState<MobilePairingView>(summary.status);
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState<"approve" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const device = summary.deviceName?.trim() || "your phone";

  const approve = async () => {
    if (!pairingId) return;
    setBusy("approve");
    setError(null);
    try {
      const res = await postJson("/api/mobile/pair/approve", { pairingId });
      if (!res.ok) {
        setError(await readError(res));
        return;
      }
      const data = (await res.json()) as MobilePairingApproveResponse;
      setCode(data.code);
      setStatus("approved");
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    if (!pairingId) return;
    setBusy("cancel");
    setError(null);
    try {
      const res = await postJson("/api/mobile/pair/revoke", { pairingId });
      if (!res.ok) {
        setError(await readError(res));
        return;
      }
      setCode(null);
      setStatus("revoked");
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  };

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (!pairingId) {
    return (
      <div className={styles.wrap}>
        <p className={styles.eyebrow}>Link a device</p>
        <h1 className={styles.title}>This link isn&apos;t valid</h1>
        <p className={styles.lead}>Start the link again from the Bloome app.</p>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className={styles.wrap}>
        <p className={styles.eyebrow}>Link a device</p>
        <h1 className={styles.title}>Connect your phone</h1>
        <p className={styles.lead}>
          A phone is asking to link to your Bloome account. Only continue if you started
          this from the Bloome app.
        </p>
        <p className={styles.device}>{device}</p>
        {error ? (
          <p role="alert" className={styles.callout}>
            {error}
          </p>
        ) : null}
        <div className={styles.actions}>
          <Button className={styles.block} onClick={approve} loading={busy === "approve"} disabled={busy !== null}>
            Approve this phone
          </Button>
          <Button
            className={styles.block}
            variant="ghost"
            onClick={cancel}
            loading={busy === "cancel"}
            disabled={busy !== null}
          >
            Not now
          </Button>
        </div>
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className={styles.wrap}>
        <p className={styles.eyebrow}>Link a device</p>
        {code ? (
          <>
            <h1 className={styles.title}>Enter this code on your phone</h1>
            <p className={styles.lead}>
              Type or paste this one-time code into the Bloome app to finish linking {device}.
            </p>
            <div className={styles.codeCard}>
              <p className={styles.codeLabel}>One-time code</p>
              <p className={styles.code} aria-live="polite">
                {code}
              </p>
              <Button variant="secondary" size="sm" onClick={copy}>
                {copied ? "Copied" : "Copy code"}
              </Button>
            </div>
            <p className={styles.note}>This code expires in a few minutes and works once.</p>
          </>
        ) : (
          <>
            <h1 className={styles.title}>This request is approved</h1>
            <p className={styles.lead}>
              That code has expired. Generate a fresh one to finish linking {device}.
            </p>
            <div className={styles.actions}>
              <Button className={styles.block} onClick={approve} loading={busy === "approve"} disabled={busy !== null}>
                Generate a new code
              </Button>
            </div>
          </>
        )}
        {error ? (
          <p role="alert" className={styles.callout}>
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  if (status === "redeemed") {
    return (
      <div className={styles.wrap}>
        <p className={styles.eyebrow}>Link a device</p>
        <h1 className={styles.title}>Phone linked</h1>
        <p className={styles.lead}>You can return to the Bloome app now.</p>
      </div>
    );
  }

  if (status === "revoked") {
    return (
      <div className={styles.wrap}>
        <p className={styles.eyebrow}>Link a device</p>
        <h1 className={styles.title}>Request denied</h1>
        <p className={styles.lead}>Nothing was linked. You can close this page.</p>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className={styles.wrap}>
        <p className={styles.eyebrow}>Link a device</p>
        <h1 className={styles.title}>This link expired</h1>
        <p className={styles.lead}>Go back to the Bloome app and start the link again.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.eyebrow}>Link a device</p>
      <h1 className={styles.title}>This link isn&apos;t valid</h1>
      <p className={styles.lead}>
        It may have expired or already been used. Start the link again from the Bloome app.
      </p>
    </div>
  );
}
