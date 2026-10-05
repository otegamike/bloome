"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { BloomMark } from "@/components/brand/bloom-mark/BloomMark";
import { Button } from "@/components/ui/button/Button";
import { PresetPicker } from "@/components/packs/preset-picker/PresetPicker";
import { StartDatePicker } from "@/components/packs/start-date-picker/StartDatePicker";
import { PackPreviewStrip } from "@/components/packs/pack-preview-strip/PackPreviewStrip";
import { ThemePicker } from "@/components/theme/theme-picker/ThemePicker";
import { usePushReminders } from "@/hooks/usePushReminders";
import { DEFAULT_PRESETS } from "@/lib/shared/config";
import { addDays, todayInTz } from "@/lib/shared/dates";
import { usePackStore } from "@/store/usePackStore";
import { useProfileStore } from "@/store/useProfileStore";
import type { DayString, PackPreset } from "@/types";
import styles from "./OnboardingFlow.module.css";

const STEPS = ["Welcome", "Choose your pill", "Start date", "Make it yours"] as const;

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

function browserToday(): DayString {
  try {
    return todayInTz(browserTimezone());
  } catch {
    return todayInTz("UTC");
  }
}

export function OnboardingFlow() {
  const router = useRouter();
  const me = useProfileStore((s) => s.me);
  const updateMe = useProfileStore((s) => s.updateMe);
  const fetchMe = useProfileStore((s) => s.fetchMe);
  const packs = usePackStore((s) => s.packs);
  const packsStatus = usePackStore((s) => s.status);
  const fetchPacks = usePackStore((s) => s.fetchPacks);
  const createPack = usePackStore((s) => s.createPack);
  const [step, setStep] = useState(0);
  const [timezone, setTimezone] = useState(browserTimezone());
  const [preset, setPreset] = useState<PackPreset>(
    DEFAULT_PRESETS[0] ?? { id: "levofem", name: "Levofem", activeDays: 21, placeboDays: 7 },
  );
  const [startDay, setStartDay] = useState<DayString>(() => addDays(browserToday(), -10));
  const [reminderTime, setReminderTime] = useState("20:00");
  const [reminderOn, setReminderOn] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { enable } = usePushReminders();

  useEffect(() => {
    void fetchMe();
    void fetchPacks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (packsStatus === "ready" && packs.length > 0) {
      router.replace("/");
    }
  }, [packsStatus, packs.length, router]);

  const zones = (() => {
    try {
      const all = Intl.supportedValuesOf("timeZone");
      if (Array.isArray(all) && all.length > 0) {
        return [browserTimezone(), ...all.filter((z) => z !== browserTimezone())];
      }
    } catch {
      // Fall through.
    }
    return [browserTimezone(), "UTC"];
  })();

  const handleWelcome = async () => {
    await updateMe({ timezone });
    setStep(1);
  };

  const handleReminders = () => {
    if (reminderOn) {
      return;
    }
    setReminderOn(true);
    void enable(reminderTime);
  };

  const handleFinish = async () => {
    setError(null);
    setFinishing(true);
    const result = await createPack({
      name: preset.name,
      activeDays: preset.activeDays,
      placeboDays: preset.placeboDays,
      startDay,
    });
    if (!result.ok) {
      setFinishing(false);
      setError(result.message ?? "Couldn't save that. Tap to try again.");
      return;
    }
    if (me && !me.reminder.enabled && reminderOn) {
      await updateMe({ reminder: { enabled: true, time: reminderTime } });
    }
    setCelebrating(true);
    window.setTimeout(() => router.replace("/"), 900);
  };

  return (
    <main className={styles.page}>
      {celebrating ? (
        <div className={styles.celebration}>
          <BloomMark size={160} open />
          <p className={styles.celebrationText}>You&apos;re all set</p>
        </div>
      ) : (
        <div className={styles.card}>
          <div role="list" aria-label="Progress" className={styles.progress}>
            {STEPS.map((label, index) => (
              <span
                key={label}
                role="listitem"
                aria-label={`${label}${index === step ? ", current step" : ""}`}
                data-active={index === step ? "true" : "false"}
                data-done={index < step ? "true" : "false"}
                className={styles.dot}
              />
            ))}
          </div>
          <div key={step} className={styles.step}>
            {step === 0 ? (
              <WelcomeStep
                timezone={timezone}
                zones={zones}
                onTimezone={setTimezone}
                onNext={() => void handleWelcome()}
              />
            ) : null}
            {step === 1 ? (
              <PillStep preset={preset} onPreset={setPreset} onBack={() => setStep(0)} onNext={() => setStep(2)} />
            ) : null}
            {step === 2 ? (
              <StartStep
                startDay={startDay}
                preset={preset}
                onStartDay={setStartDay}
                onBack={() => setStep(1)}
                onNext={() => setStep(3)}
              />
            ) : null}
            {step === 3 ? (
              <FinishStep
                reminderTime={reminderTime}
                reminderOn={reminderOn}
                onReminderTime={setReminderTime}
                onReminders={handleReminders}
                onBack={() => setStep(2)}
                onFinish={() => void handleFinish()}
                finishing={finishing}
                error={error}
              />
            ) : null}
          </div>
        </div>
      )}
    </main>
  );
}

function WelcomeStep({
  timezone,
  zones,
  onTimezone,
  onNext,
}: {
  timezone: string;
  zones: string[];
  onTimezone: (zone: string) => void;
  onNext: () => void;
}) {
  return (
    <div className={styles.pane}>
      <BloomMark size={96} />
      <h1 className={styles.title}>Welcome to Bloome</h1>
      <p className={styles.sub}>
        We&apos;ll use {timezone} for your days and reminders.
      </p>
      <div className={styles.field}>
        <label htmlFor="onboarding-timezone" className={styles.label}>
          Timezone
        </label>
        <select
          id="onboarding-timezone"
          value={timezone}
          onChange={(e) => onTimezone(e.target.value)}
          className={styles.select}
        >
          {zones.map((zone, index) => (
            <option key={zone} value={zone}>
              {index === 0 ? `${zone} (Detected)` : zone}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.nav}>
        <span />
        <Button onClick={onNext}>Continue</Button>
      </div>
    </div>
  );
}

function PillStep({
  preset,
  onPreset,
  onBack,
  onNext,
}: {
  preset: PackPreset;
  onPreset: (p: PackPreset) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className={styles.pane}>
      <h1 className={styles.title}>Choose your pill</h1>
      <PresetPicker value={preset} onChange={onPreset} />
      <div className={styles.nav}>
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext}>Continue</Button>
      </div>
    </div>
  );
}

function StartStep({
  startDay,
  preset,
  onStartDay,
  onBack,
  onNext,
}: {
  startDay: DayString;
  preset: PackPreset;
  onStartDay: (day: DayString) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className={styles.pane}>
      <h1 className={styles.title}>When did you start?</h1>
      <StartDatePicker value={startDay} onChange={onStartDay} maxDay={browserToday()} />
      <PackPreviewStrip
        variant="preview"
        startDay={startDay}
        activeDays={preset.activeDays}
        placeboDays={preset.placeboDays}
      />
      <div className={styles.nav}>
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext}>Continue</Button>
      </div>
    </div>
  );
}

function FinishStep({
  reminderTime,
  reminderOn,
  onReminderTime,
  onReminders,
  onBack,
  onFinish,
  finishing,
  error,
}: {
  reminderTime: string;
  reminderOn: boolean;
  onReminderTime: (time: string) => void;
  onReminders: () => void;
  onBack: () => void;
  onFinish: () => void;
  finishing: boolean;
  error: string | null;
}) {
  return (
    <div className={styles.pane}>
      <h1 className={styles.title}>Make it yours</h1>
      <ThemePicker />
      <div className={styles.reminderRow}>
        <div>
          <p className={styles.reminderTitle}>Daily reminder</p>
          <p className={styles.sub}>Optional. You can change this anytime.</p>
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor="onboarding-reminder-time" className={styles.label}>
          Reminder time
        </label>
        <input
          id="onboarding-reminder-time"
          type="time"
          value={reminderTime}
          onChange={(e) => onReminderTime(e.target.value)}
          className={styles.select}
        />
      </div>
      <Button variant="secondary" disabled={reminderOn} onClick={onReminders}>
        {reminderOn ? "Reminders on" : "Turn on reminders"}
      </Button>
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
      <div className={styles.nav}>
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button loading={finishing} onClick={onFinish}>
          Finish
        </Button>
      </div>
    </div>
  );
}
