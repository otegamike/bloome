"use client";

import { useEffect, useState } from "react";

import { Pencil } from "@/components/icons/Pencil";
import { Plus } from "@/components/icons/Plus";
import { Trash } from "@/components/icons/Trash";
import { Chip } from "@/components/ui/chip/Chip";
import { Button } from "@/components/ui/button/Button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog/ConfirmDialog";
import { Dialog } from "@/components/ui/dialog/Dialog";
import { Skeleton } from "@/components/ui/skeleton/Skeleton";
import { PresetPicker } from "@/components/packs/preset-picker/PresetPicker";
import { StartDatePicker } from "@/components/packs/start-date-picker/StartDatePicker";
import { addDays, todayInTz } from "@/lib/shared/dates";
import { DEFAULT_PRESETS } from "@/lib/shared/config";
import { useAlertStore } from "@/store/useAlertStore";
import { usePackStore } from "@/store/usePackStore";
import type { PackDTO } from "@/types/api";
import type { DayString, PackPreset } from "@/types";
import styles from "./Packs.module.css";

function browserToday(): DayString {
  try {
    return todayInTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return todayInTz("UTC");
  }
}

export function Packs() {
  const packs = usePackStore((s) => s.packs);
  const status = usePackStore((s) => s.status);
  const fetchPacks = usePackStore((s) => s.fetchPacks);
  const deletePack = usePackStore((s) => s.deletePack);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PackDTO | null>(null);
  const [deleting, setDeleting] = useState<PackDTO | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);

  useEffect(() => {
    void fetchPacks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (pack: PackDTO) => {
    setEditing(pack);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleting) {
      return;
    }
    setBusyDelete(true);
    const ok = await deletePack(deleting.id);
    setBusyDelete(false);
    if (ok) {
      setDeleting(null);
      useAlertStore.getState().addAlert({ kind: "success", message: "Pack deleted" });
    }
  };

  if (status === "loading" && packs.length === 0) {
    return (
      <section aria-label="Packs" className={styles.stack}>
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </section>
    );
  }

  return (
    <section aria-label="Packs" className={styles.stack}>
      {packs.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.heading}>Packs</h2>
          <p className={styles.emptyText}>No packs yet. Start one and your calendar will fill in.</p>
        </div>
      ) : (
        packs.map((pack) => (
          <PackCard key={pack.id} pack={pack} onEdit={() => openEdit(pack)} onDelete={() => setDeleting(pack)} />
        ))
      )}
      <Button iconLeft={<Plus size={18} />} onClick={openNew}>
        Start a new pack
      </Button>
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        labelledBy="pack-form-title"
      >
        <PackForm
          key={editing?.id ?? "new"}
          editing={editing}
          onDone={() => setFormOpen(false)}
        />
      </Dialog>
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete this pack?"
        body="Your logs stay, but days may show differently."
        confirmLabel="Delete pack"
        confirming={busyDelete}
        onConfirm={handleDelete}
      />
    </section>
  );
}

function PackForm({ editing, onDone }: { editing: PackDTO | null; onDone: () => void }) {
  const createPack = usePackStore((s) => s.createPack);
  const updatePack = usePackStore((s) => s.updatePack);
  const initialPreset: PackPreset =
    DEFAULT_PRESETS.find((p) => p.name === editing?.name) ??
    (editing
      ? { id: "custom", name: editing.name, activeDays: editing.activeDays, placeboDays: editing.placeboDays }
      : DEFAULT_PRESETS[0] ?? { id: "levofem", name: "Levofem", activeDays: 21, placeboDays: 7 });
  const [preset, setPreset] = useState<PackPreset>(initialPreset);
  const [startDay, setStartDay] = useState<DayString>(editing?.startDay ?? browserToday());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const maxDay = addDays(browserToday(), 30);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    const result = editing
      ? await updatePack(editing.id, {
          name: preset.name,
          activeDays: preset.activeDays,
          placeboDays: preset.placeboDays,
          startDay,
        })
      : await createPack({
          name: preset.name,
          activeDays: preset.activeDays,
          placeboDays: preset.placeboDays,
          startDay,
        });
    setSaving(false);
    if (!result.ok) {
      setError(result.message ?? "Couldn't save that. Tap to try again.");
      return;
    }
    useAlertStore.getState().addAlert({ kind: "success", message: "Saved" });
    onDone();
  };

  return (
    <div className={styles.form}>
      <h2 id="pack-form-title" className={styles.heading}>
        {editing ? "Edit pack" : "Start a new pack"}
      </h2>
      {editing ? (
        <p className={styles.note}>Changing these updates how past days are shown.</p>
      ) : null}
      <PresetPicker value={preset} onChange={setPreset} />
      <StartDatePicker value={startDay} onChange={setStartDay} maxDay={maxDay} />
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
      <Button loading={saving} onClick={handleSave}>
        {editing ? "Save changes" : "Start pack"}
      </Button>
    </div>
  );
}

function PackCard({
  pack,
  onEdit,
  onDelete,
}: {
  pack: PackDTO;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className={styles.packCard}>
      <div className={styles.packTop}>
        <div>
          <h3 className={styles.packName}>{pack.name}</h3>
          <p className={styles.packDetail}>
            {pack.activeDays} + {pack.placeboDays} · Started {formatStart(pack.startDay)}
          </p>
        </div>
        {pack.isCurrent ? <Chip tone="taken">Current</Chip> : null}
      </div>
      <div className={styles.packActions}>
        <button type="button" onClick={onEdit} aria-label={`Edit ${pack.name}`} className={styles.iconButton}>
          <Pencil size={18} />
        </button>
        <button type="button" onClick={onDelete} aria-label={`Delete ${pack.name}`} className={styles.iconButton}>
          <Trash size={18} />
        </button>
      </div>
    </article>
  );
}

function formatStart(startDay: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(`${startDay}T00:00:00Z`));
  } catch {
    return startDay;
  }
}
