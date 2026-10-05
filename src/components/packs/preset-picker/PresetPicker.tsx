"use client";

import { useState } from "react";

import { Check } from "@/components/icons/Check";
import { TextField } from "@/components/ui/text-field/TextField";
import { DEFAULT_PRESETS } from "@/lib/shared/config";
import type { PackPreset } from "@/types";
import styles from "./PresetPicker.module.css";

interface PresetPickerProps {
  value: PackPreset;
  onChange: (preset: PackPreset) => void;
}

export function PresetPicker({ value, onChange }: PresetPickerProps) {
  const [customName, setCustomName] = useState(value.id === "custom" ? value.name : "");
  const [customActive, setCustomActive] = useState(
    value.id === "custom" ? String(value.activeDays) : "21",
  );
  const [customPlacebo, setCustomPlacebo] = useState(
    value.id === "custom" ? String(value.placeboDays) : "7",
  );
  const [customError, setCustomError] = useState<string | undefined>();

  const selectCustom = () => {
    onChange({
      id: "custom",
      name: customName.trim() || "Custom",
      activeDays: Number(customActive) || 21,
      placeboDays: Number(customPlacebo) || 0,
    });
  };

  const applyCustom = () => {
    const name = customName.trim();
    const active = Number(customActive);
    const placebo = Number(customPlacebo);
    if (!name || name.length > 60) {
      setCustomError("Give your pack a name (up to 60 characters)");
      return;
    }
    if (!Number.isInteger(active) || active < 1 || active > 120) {
      setCustomError("Active days must be between 1 and 120");
      return;
    }
    if (!Number.isInteger(placebo) || placebo < 0 || placebo > 14) {
      setCustomError("Placebo days must be between 0 and 14");
      return;
    }
    setCustomError(undefined);
    onChange({ id: "custom", name, activeDays: active, placeboDays: placebo });
  };

  return (
    <div role="radiogroup" aria-label="Pill preset" className={styles.list}>
      {DEFAULT_PRESETS.map((preset) => (
        <PresetCard
          key={preset.id}
          preset={preset}
          selected={value.id === preset.id}
          onSelect={() => onChange(preset)}
        />
      ))}
      <div
        role="radio"
        aria-checked={value.id === "custom"}
        data-selected={value.id === "custom" ? "true" : "false"}
        tabIndex={0}
        onClick={selectCustom}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            selectCustom();
          }
        }}
        className={styles.card}
      >
        <div className={styles.row}>
          <div>
            <p className={styles.name}>Custom</p>
            <p className={styles.detail}>Your own rhythm</p>
          </div>
          {value.id === "custom" ? (
            <span className={styles.badge}>
              <Check size={14} />
            </span>
          ) : null}
        </div>
        <div data-open={value.id === "custom" ? "true" : "false"} className={styles.custom}>
          <div className={styles.customInner}>
            <TextField
              id="custom-name"
              label="Pack name"
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onBlur={applyCustom}
              error={customError}
            />
            <div className={styles.numbers}>
              <label className={styles.numberLabel}>
                Active days
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={customActive}
                  onChange={(e) => setCustomActive(e.target.value)}
                  onBlur={applyCustom}
                  className={styles.number}
                />
              </label>
              <label className={styles.numberLabel}>
                Placebo days
                <input
                  type="number"
                  min={0}
                  max={14}
                  value={customPlacebo}
                  onChange={(e) => setCustomPlacebo(e.target.value)}
                  onBlur={applyCustom}
                  className={styles.number}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PresetCard({
  preset,
  selected,
  onSelect,
}: {
  preset: PackPreset;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-selected={selected ? "true" : "false"}
      onClick={onSelect}
      className={styles.card}
    >
      <div className={styles.row}>
        <div>
          <p className={styles.name}>{preset.name}</p>
          <p className={styles.detail}>
            {preset.activeDays} active + {preset.placeboDays} placebo
          </p>
        </div>
        {selected ? (
          <span className={styles.badge}>
            <Check size={14} />
          </span>
        ) : null}
      </div>
      <span aria-hidden="true" className={styles.miniStrip}>
        {Array.from({ length: preset.activeDays + preset.placeboDays }).map((_, i) => (
          <MiniDot key={i} active={i < preset.activeDays} />
        ))}
      </span>
    </button>
  );
}

function MiniDot({ active }: { active: boolean }) {
  return (
    <span data-active={active ? "true" : "false"} className={styles.miniDot} />
  );
}
