"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ApiClientError,
  sendTestPush,
  subscribePush,
  unsubscribePush,
} from "@/client/apiClient";
import { isMockMode } from "@/client/mockMode";
import { useAlertStore } from "@/store/useAlertStore";
import { useProfileStore } from "@/store/useProfileStore";

export type PushSupport = "ok" | "unsupported" | "ios-needs-install";

function detectSupport(): PushSupport {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "unsupported";
  }
  const hasApis =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (hasApis) {
    return "ok";
  }
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    typeof (navigator as Navigator & { standalone?: boolean }).standalone === "boolean" &&
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIos && !standalone && !iosStandalone) {
    return "ios-needs-install";
  }
  return "unsupported";
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const binary = window.atob(raw);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

const MOCK_SUB_KEY = "bloome.mockPushEndpoint";

function mockEndpoint(): string | null {
  try {
    return window.localStorage.getItem(MOCK_SUB_KEY);
  } catch {
    return null;
  }
}

export function usePushReminders() {
  const [support] = useState<PushSupport>(detectSupport);
  const [permission, setPermission] = useState<NotificationPermission | null>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : null,
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const updateMe = useProfileStore((s) => s.updateMe);
  const fetchMe = useProfileStore((s) => s.fetchMe);

  useEffect(() => {
    if (support !== "ok") {
      return;
    }
    let cancelled = false;
    const readSubscription = async () => {
      const subscribed = isMockMode()
        ? mockEndpoint() !== null
        : (await navigator.serviceWorker.ready
            .then((registration) => registration.pushManager.getSubscription())
            .catch(() => null)) !== null;
      if (!cancelled) {
        setIsSubscribed(subscribed);
      }
    };
    void readSubscription();
    return () => {
      cancelled = true;
    };
  }, [support]);

  const enable = useCallback(
    async (time: string) => {
      const alerts = useAlertStore.getState();
      if (support !== "ok") {
        return;
      }
      setBusy(true);
      try {
        if (isMockMode()) {
          const endpoint = `https://mock.push/${Math.random().toString(36).slice(2)}`;
          await subscribePush({ endpoint, keys: { p256dh: "mock", auth: "mock" } });
          try {
            window.localStorage.setItem(MOCK_SUB_KEY, endpoint);
          } catch {
            // Ignore storage failures.
          }
          await updateMe({ reminder: { enabled: true, time } });
          setIsSubscribed(true);
          return;
        }
        const registration =
          (await navigator.serviceWorker.getRegistration()) ??
          (await navigator.serviceWorker.register("/sw.js"));
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== "granted") {
          return;
        }
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
          alerts.addAlert({ kind: "error", message: "Reminders aren't set up yet. Try again later." });
          return;
        }
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
        const json = subscription.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
          throw new Error("Subscription looks invalid");
        }
        await subscribePush({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        });
        await updateMe({ reminder: { enabled: true, time } });
        setIsSubscribed(true);
      } catch {
        alerts.addAlert({
          kind: "error",
          message: "Couldn't turn reminders on. Try again?",
        });
      } finally {
        setBusy(false);
      }
    },
    [support, updateMe],
  );

  const disable = useCallback(async () => {
    const alerts = useAlertStore.getState();
    setBusy(true);
    try {
      if (isMockMode()) {
        const endpoint = mockEndpoint();
        if (endpoint) {
          await unsubscribePush(endpoint);
          try {
            window.localStorage.removeItem(MOCK_SUB_KEY);
          } catch {
            // Ignore storage failures.
          }
        }
        await fetchMe();
        const count = useProfileStore.getState().me?.pushDeviceCount ?? 1;
        if (count === 0) {
          await updateMe({ reminder: { enabled: false } });
        }
        setIsSubscribed(false);
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await unsubscribePush(subscription.endpoint);
      }
      await fetchMe();
      const count = useProfileStore.getState().me?.pushDeviceCount ?? 1;
      if (count === 0) {
        await updateMe({ reminder: { enabled: false } });
      }
      setIsSubscribed(false);
    } catch {
      alerts.addAlert({
        kind: "error",
        message: "Couldn't turn reminders off. Try again?",
      });
    } finally {
      setBusy(false);
    }
  }, [fetchMe, updateMe]);

  const sendTest = useCallback(async () => {
    const alerts = useAlertStore.getState();
    setBusy(true);
    try {
      const { sent } = await sendTestPush();
      if (sent === 0) {
        alerts.addAlert({
          kind: "info",
          message: "No devices received it. Try turning reminders off and on again.",
        });
      } else {
        alerts.addAlert({ kind: "success", message: "Test sent. Check your notifications." });
      }
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 429) {
        alerts.addAlert({
          kind: "info",
          message: "Give it a minute before sending another test.",
        });
      } else {
        alerts.addAlert({ kind: "error", message: "Couldn't send a test. Try again?" });
      }
    } finally {
      setBusy(false);
    }
  }, []);

  return { support, permission, isSubscribed, busy, enable, disable, sendTest };
}
