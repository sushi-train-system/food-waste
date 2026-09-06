"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createCategory,
  createItem,
  createTimeSlot,
  changeSettingsPassword,
  errorMessage,
  fetchMembers,
  fetchAdminCategories,
  fetchTimeSlots,
  inviteMember,
  lockSettings,
  unlockSettings,
  updateCategory,
  updateItem,
  updateMember,
  updateTimeSlot,
} from "@/lib/api";
import { slotLabel } from "@/lib/config";
import type { AdminCategory, StoreMember, TimeSlotDTO } from "@/lib/types";

type SettingsSection = "prices" | "products" | "categories" | "slots" | "users";

type SettingsDrafts = {
  prices: Record<string, string>;
  productNames: Record<string, string>;
  productActive: Record<string, boolean>;
  categoryNames: Record<string, string>;
  categoryActive: Record<string, boolean>;
  timeSlots: Record<string, string>;
  timeSlotActive: Record<string, boolean>;
};

const emptyDrafts = (): SettingsDrafts => ({
  prices: {},
  productNames: {},
  productActive: {},
  categoryNames: {},
  categoryActive: {},
  timeSlots: {},
  timeSlotActive: {},
});

const SETTINGS_SECTIONS: { id: SettingsSection; label: string; description: string }[] =
  [
    {
      id: "prices",
      label: "Price Changes",
      description: "Edit current prices used by the app.",
    },
    {
      id: "products",
      label: "Product Changes",
      description: "Edit product names, visibility, and additions.",
    },
    {
      id: "categories",
      label: "Category Changes",
      description: "Edit category names and category additions.",
    },
    {
      id: "slots",
      label: "Time Slots",
      description: "Add, remove, and edit store time slots.",
    },
    {
      id: "users",
      label: "Access Members",
      description: "Add people who can sign in to this store.",
    },
  ];

export default function SettingsTab() {
  const [cats, setCats] = useState<AdminCategory[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlotDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState<SettingsSection | null>(null);
  const [drafts, setDrafts] = useState<SettingsDrafts>(() => emptyDrafts());
  const [savedMessage, setSavedMessage] = useState("");
  const activeCats = cats.filter((cat) => cat.active);
  const inactiveCats = cats.filter((cat) => !cat.active);

  const loadMenuSetup = useCallback(async () => {
    if (cats.length > 0) return;
    setCats(await fetchAdminCategories());
  }, [cats.length]);

  const loadTimeSlotSetup = useCallback(async () => {
    if (timeSlots.length > 0) return;
    setTimeSlots(await fetchTimeSlots({ includeInactive: true }));
  }, [timeSlots.length]);

  const reloadCurrentSection = useCallback(async () => {
    try {
      if (
        section === "prices" ||
        section === "products" ||
        section === "categories"
      ) {
        setCats(await fetchAdminCategories());
      }
      if (section === "slots") {
        setTimeSlots(await fetchTimeSlots({ includeInactive: true }));
      }
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [section]);

  useEffect(() => {
    return () => {
      void lockSettings().catch(() => undefined);
    };
  }, []);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    setSavedMessage("");
    try {
      await fn();
      await reloadCurrentSection();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const changedPrices = useMemo(
    () =>
      cats.flatMap((cat) =>
        cat.items.flatMap((item) => {
          const draft = drafts.prices[item.id];
          if (draft === undefined) return [];
          const value = draft.trim();
          const priceAud = Number(value);
          if (!value || !Number.isFinite(priceAud) || priceAud < 0) {
            return [{ id: item.id, priceAud, invalid: true }];
          }
          if (priceAud === item.priceAud) return [];
          return [{ id: item.id, priceAud, invalid: false }];
        }),
      ),
    [cats, drafts.prices],
  );

  const changedProductNames = useMemo(
    () =>
      cats.flatMap((cat) =>
        cat.items.flatMap((item) => {
          const draft = drafts.productNames[item.id];
          if (draft === undefined) return [];
          const name = draft.trim();
          if (!name) return [{ id: item.id, name, invalid: true }];
          if (name === item.name) return [];
          return [{ id: item.id, name, invalid: false }];
        }),
      ),
    [cats, drafts.productNames],
  );

  const changedProductActive = useMemo(
    () =>
      cats.flatMap((cat) =>
        cat.items.flatMap((item) => {
          const active = drafts.productActive[item.id];
          if (active === undefined || active === item.active) return [];
          return [{ id: item.id, active }];
        }),
      ),
    [cats, drafts.productActive],
  );

  const changedCategoryNames = useMemo(
    () =>
      cats.flatMap((cat) => {
        const draft = drafts.categoryNames[cat.id];
        if (draft === undefined) return [];
        const name = draft.trim();
        if (!name) return [{ id: cat.id, name, invalid: true }];
        if (name === cat.name) return [];
        return [{ id: cat.id, name, invalid: false }];
      }),
    [cats, drafts.categoryNames],
  );

  const changedCategoryActive = useMemo(
    () =>
      cats.flatMap((cat) => {
        const active = drafts.categoryActive[cat.id];
        if (active === undefined || active === cat.active) return [];
        return [{ id: cat.id, active }];
      }),
    [cats, drafts.categoryActive],
  );

  const changedTimeSlots = useMemo(
    () =>
      timeSlots.flatMap((timeSlot) => {
        const draft = drafts.timeSlots[timeSlot.id];
        if (draft === undefined) return [];
        const value = draft.trim();
        const startHour = Math.floor(Number(value));
        if (
          !value ||
          !Number.isFinite(startHour) ||
          startHour < 0 ||
          startHour > 23
        ) {
          return [{ id: timeSlot.id, startHour, invalid: true }];
        }
        if (startHour === timeSlot.startHour) return [];
        return [{ id: timeSlot.id, startHour, invalid: false }];
      }),
    [timeSlots, drafts.timeSlots],
  );

  const changedTimeSlotActive = useMemo(
    () =>
      timeSlots.flatMap((timeSlot) => {
        const active = drafts.timeSlotActive[timeSlot.id];
        if (active === undefined || active === (timeSlot.active ?? true)) {
          return [];
        }
        return [{ id: timeSlot.id, active }];
      }),
    [timeSlots, drafts.timeSlotActive],
  );

  const pendingChanges =
    changedPrices.length +
    changedProductNames.length +
    changedProductActive.length +
    changedCategoryNames.length +
    changedCategoryActive.length +
    changedTimeSlots.length +
    changedTimeSlotActive.length;
  const hasInvalidDraft =
    changedPrices.some((change) => change.invalid) ||
    changedProductNames.some((change) => change.invalid) ||
    changedCategoryNames.some((change) => change.invalid) ||
    changedTimeSlots.some((change) => change.invalid);

  const handleSaveDrafts = async () => {
    setError("");
    setSavedMessage("");
    if (pendingChanges === 0) return;
    if (hasInvalidDraft) {
      setError("Please enter valid values before saving.");
      return;
    }

    setBusy(true);
    try {
      const itemUpdates = new Map<
        string,
        { priceAud?: number; name?: string; active?: boolean }
      >();
      const updateItemDraft = (
        id: string,
        data: { priceAud?: number; name?: string; active?: boolean },
      ) => {
        itemUpdates.set(id, { ...itemUpdates.get(id), ...data });
      };
      changedPrices.forEach((change) =>
        updateItemDraft(change.id, { priceAud: change.priceAud }),
      );
      changedProductNames.forEach((change) =>
        updateItemDraft(change.id, { name: change.name }),
      );
      changedProductActive.forEach((change) =>
        updateItemDraft(change.id, { active: change.active }),
      );

      await Promise.all([
        ...Array.from(itemUpdates.entries()).map(([id, data]) =>
          updateItem(id, data),
        ),
        ...cats
          .flatMap((cat) => {
            const nameChange = changedCategoryNames.find(
              (change) => change.id === cat.id,
            );
            const activeChange = changedCategoryActive.find(
              (change) => change.id === cat.id,
            );
            if (!nameChange && !activeChange) return [];
            return [
              updateCategory(cat.id, {
                ...(nameChange ? { name: nameChange.name } : {}),
                ...(activeChange ? { active: activeChange.active } : {}),
              }),
            ];
          }),
        ...timeSlots
          .flatMap((timeSlot) => {
            const slotChange = changedTimeSlots.find(
              (change) => change.id === timeSlot.id,
            );
            const activeChange = changedTimeSlotActive.find(
              (change) => change.id === timeSlot.id,
            );
            if (!slotChange && !activeChange) return [];
            return [
              updateTimeSlot(timeSlot.id, {
                ...(slotChange ? { startHour: slotChange.startHour } : {}),
                ...(activeChange ? { active: activeChange.active } : {}),
              }),
            ];
          }),
      ]);
      setDrafts(emptyDrafts());
      await reloadCurrentSection();
      setSavedMessage("Changes saved.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handleAddCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    setNewCatName("");
    await run(() => createCategory(name));
  };

  const openSection = async (nextSection: SettingsSection) => {
    setError("");
    setSavedMessage("");
    setSection(nextSection);
    setSectionLoading(true);
    try {
      if (
        nextSection === "prices" ||
        nextSection === "products" ||
        nextSection === "categories"
      ) {
        await loadMenuSetup();
      }
      if (nextSection === "slots") {
        await loadTimeSlotSetup();
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSectionLoading(false);
    }
  };

  const closeSection = () => {
    setError("");
    setSavedMessage("");
    setDrafts(emptyDrafts());
    setSection(null);
  };

  const currentSection = SETTINGS_SECTIONS.find((s) => s.id === section);

  if (loading) {
    return <div className="p-6 text-center text-stone-500">Loading...</div>;
  }

  if (!unlocked) {
    return (
      <SettingsUnlockScreen
        error={error}
        onClearError={() => setError("")}
        onUnlock={async (password) => {
          setLoading(true);
          setError("");
          try {
            await unlockSettings(password);
            setUnlocked(true);
          } catch (e) {
            setError(errorMessage(e));
          } finally {
            setLoading(false);
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-4 px-4 pb-44 pt-4">
      {section === null ? (
        <>
          <div>
            <h2 className="text-xl font-bold text-stone-900">Settings Menu</h2>
            <p className="mt-1 text-sm text-stone-500">
              Select only the setup area you want to manage.
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600 break-all">
              {error}
            </p>
          )}

          <div className="space-y-2">
            {SETTINGS_SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => openSection(s.id)}
                disabled={sectionLoading}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-4 text-left shadow-sm transition-colors hover:bg-stone-50 disabled:opacity-50"
              >
                <span className="min-w-0">
                  <span className="block text-base font-bold text-stone-800">
                    {s.label}
                  </span>
                  <span className="mt-1 block text-sm text-stone-500">
                    {s.description}
                  </span>
                </span>
                <span className="shrink-0 text-xl font-semibold text-stone-300">
                  &gt;
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={closeSection}
              disabled={busy || sectionLoading}
              className="mt-0.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm font-bold text-stone-600 shadow-sm disabled:opacity-40"
              aria-label="Back to settings menu"
            >
              &lt;
            </button>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-stone-900">
                {currentSection?.label}
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                {currentSection?.description}
              </p>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600 break-all">
              {error}
            </p>
          )}

          {sectionLoading && (
            <div className="rounded-xl border border-stone-200 bg-white p-6 text-center text-sm text-stone-500">
              Loading...
            </div>
          )}

          {!sectionLoading && section === "prices" && (
            <PriceChanges
              cats={cats}
              busy={busy}
              drafts={drafts.prices}
              onPriceChange={(id, value) => {
                setSavedMessage("");
                setDrafts((current) => ({
                  ...current,
                  prices: { ...current.prices, [id]: value },
                }));
              }}
            />
          )}

          {!sectionLoading &&
            section === "products" &&
            activeCats.map((cat) => (
              <ProductCategoryCard
                key={cat.id}
                cat={cat}
                busy={busy}
                drafts={drafts.productNames}
                activeDrafts={drafts.productActive}
                onProductNameChange={(id, value) => {
                  setSavedMessage("");
                  setDrafts((current) => ({
                    ...current,
                    productNames: { ...current.productNames, [id]: value },
                  }));
                }}
                onProductActiveChange={(id, active) => {
                  setSavedMessage("");
                  setDrafts((current) => ({
                    ...current,
                    productActive: { ...current.productActive, [id]: active },
                  }));
                }}
                run={run}
              />
            ))}

          {!sectionLoading && section === "categories" && (
            <>
              {activeCats.map((cat) => (
                <CategorySettingsCard
                  key={cat.id}
                  cat={cat}
                  busy={busy}
                  value={drafts.categoryNames[cat.id] ?? cat.name}
                  active={drafts.categoryActive[cat.id] ?? cat.active}
                  changed={
                    (drafts.categoryNames[cat.id] !== undefined &&
                      drafts.categoryNames[cat.id].trim() !== cat.name) ||
                    (drafts.categoryActive[cat.id] !== undefined &&
                      drafts.categoryActive[cat.id] !== cat.active)
                  }
                  onChange={(value) => {
                    setSavedMessage("");
                    setDrafts((current) => ({
                      ...current,
                      categoryNames: { ...current.categoryNames, [cat.id]: value },
                    }));
                  }}
                  onActiveChange={(active) => {
                    setSavedMessage("");
                    setDrafts((current) => ({
                      ...current,
                      categoryActive: {
                        ...current.categoryActive,
                        [cat.id]: active,
                      },
                    }));
                  }}
                />
              ))}

              <div className="rounded-xl border border-dashed border-stone-300 bg-white p-4">
                <label className="block text-sm font-semibold text-stone-700 mb-2">
                  Add Category
                </label>
                <div className="flex gap-2">
                  <input
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="e.g. Side Dishes"
                    className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-base"
                  />
                  <button
                    onClick={handleAddCategory}
                    disabled={busy || !newCatName.trim()}
                    className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              </div>

              {inactiveCats.length > 0 && (
                <div className="space-y-2">
                  <p className="px-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
                    Hidden Categories
                  </p>
                  {inactiveCats.map((cat) => (
                    <CategorySettingsCard
                      key={cat.id}
                      cat={cat}
                      busy={busy}
                      value={drafts.categoryNames[cat.id] ?? cat.name}
                      active={drafts.categoryActive[cat.id] ?? cat.active}
                      changed={
                        (drafts.categoryNames[cat.id] !== undefined &&
                          drafts.categoryNames[cat.id].trim() !== cat.name) ||
                        (drafts.categoryActive[cat.id] !== undefined &&
                          drafts.categoryActive[cat.id] !== cat.active)
                      }
                      onChange={(value) => {
                        setSavedMessage("");
                        setDrafts((current) => ({
                          ...current,
                          categoryNames: {
                            ...current.categoryNames,
                            [cat.id]: value,
                          },
                        }));
                      }}
                      onActiveChange={(active) => {
                        setSavedMessage("");
                        setDrafts((current) => ({
                          ...current,
                          categoryActive: {
                            ...current.categoryActive,
                            [cat.id]: active,
                          },
                        }));
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {!sectionLoading && section === "slots" && (
            <TimeSlotsSettings
              slots={timeSlots}
              busy={busy}
              drafts={drafts.timeSlots}
              activeDrafts={drafts.timeSlotActive}
              onSlotChange={(id, value) => {
                setSavedMessage("");
                setDrafts((current) => ({
                  ...current,
                  timeSlots: { ...current.timeSlots, [id]: value },
                }));
              }}
              onSlotActiveChange={(id, active) => {
                setSavedMessage("");
                setDrafts((current) => ({
                  ...current,
                  timeSlotActive: { ...current.timeSlotActive, [id]: active },
                }));
              }}
              run={run}
            />
          )}

          {!sectionLoading && section === "users" && <MembersSettings />}
        </>
      )}

      {section !== null && section !== "users" && (
        <div className="fixed bottom-16 inset-x-0 z-20 border-t border-stone-200 bg-white/95 px-4 py-3 shadow-[0_-4px_18px_rgba(0,0,0,0.08)] backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            {savedMessage && (
              <p className="hidden text-sm font-semibold text-emerald-700 sm:block">
                {savedMessage}
              </p>
            )}
            <button
              type="button"
              onClick={handleSaveDrafts}
              disabled={busy || pendingChanges === 0}
              className="flex-1 rounded-xl bg-rose-800 px-4 py-3 text-base font-bold text-white shadow-sm disabled:bg-stone-300 disabled:text-stone-600"
            >
              {busy
                ? "Saving..."
                : pendingChanges > 0
                  ? `Save (${pendingChanges} changes)`
                  : "No changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsUnlockScreen({
  error,
  onClearError,
  onUnlock,
}: {
  error: string;
  onClearError: () => void;
  onUnlock: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const message = settingsUnlockMessage(error);

  const submit = async () => {
    if (!password) return;
    setBusy(true);
    try {
      await onUnlock(password);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-7.5rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-stone-900">Settings Password</h2>
        <p className="mt-1 text-sm text-stone-500">
          Enter the store settings password to manage menu and access members.
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (message) onClearError();
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Settings password"
          aria-invalid={Boolean(message)}
          className={`mt-4 w-full rounded-lg border px-3 py-3 text-base ${
            message ? "border-red-400 bg-red-50/40" : "border-stone-300"
          }`}
          autoFocus
        />
        {message && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p className="font-semibold">{message.title}</p>
            <p className="mt-1 text-red-600">{message.body}</p>
          </div>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={busy || !password}
          className="mt-4 w-full rounded-lg bg-rose-800 px-4 py-3 text-base font-bold text-white disabled:opacity-40"
        >
          {busy ? "Checking..." : "Unlock Settings"}
        </button>
        <p className="mt-3 text-xs text-stone-400">
          Initial password is 0000 unless it has been changed.
        </p>
      </div>
    </div>
  );
}

function settingsUnlockMessage(error: string) {
  if (!error) return null;
  if (
    error.includes("invalid settings password") ||
    error.includes("Settings password is incorrect")
  ) {
    return {
      title: "Incorrect password",
      body: "Please check the settings password and try again.",
    };
  }
  if (
    error.includes("store access required") ||
    error.includes("Store access is required")
  ) {
    return {
      title: "Store access is not set up",
      body: "Please sign in with a user that belongs to this store.",
    };
  }
  if (
    error.includes("authentication required") ||
    error.includes("Please sign in again")
  ) {
    return {
      title: "Sign in required",
      body: "Please sign in again before opening settings.",
    };
  }
  return {
    title: "Settings could not be opened",
    body: "Please try again. If this keeps happening, contact the administrator.",
  };
}

function TimeSlotsSettings({
  slots,
  busy,
  drafts,
  activeDrafts,
  onSlotChange,
  onSlotActiveChange,
  run,
}: {
  slots: TimeSlotDTO[];
  busy: boolean;
  drafts: Record<string, string>;
  activeDrafts: Record<string, boolean>;
  onSlotChange: (id: string, value: string) => void;
  onSlotActiveChange: (id: string, active: boolean) => void;
  run: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [newStartHour, setNewStartHour] = useState("");
  const isActive = (slot: TimeSlotDTO) =>
    activeDrafts[slot.id] ?? slot.active ?? true;
  const savedActive = (slot: TimeSlotDTO) => slot.active ?? true;
  const activeSlots = slots.filter((slot) => savedActive(slot));
  const inactiveSlots = slots.filter(
    (slot) => !savedActive(slot),
  );

  const addSlot = async () => {
    const value = Math.floor(Number(newStartHour));
    if (!Number.isFinite(value) || value < 0 || value > 23) return;
    setNewStartHour("");
    await run(() => createTimeSlot(value));
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Active time slots appear on the Input screen. Existing waste entries
        keep their original slot hour even if a slot is hidden.
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="border-b border-stone-200 bg-stone-50 px-3 py-2">
          <h3 className="text-base font-bold text-stone-800">Current Slots</h3>
        </div>
        <div className="divide-y divide-stone-100">
          {activeSlots.length === 0 && (
            <p className="px-3 py-4 text-sm text-stone-400">No time slots.</p>
          )}
          {activeSlots.map((slot) => {
            const draft = drafts[slot.id];
            const value = draft ?? String(slot.startHour);
            const active = isActive(slot);
            const savedActive = slot.active ?? true;
            const parsed = Math.floor(Number(value.trim()));
            const invalid =
              draft !== undefined &&
              (!value.trim() ||
                !Number.isFinite(parsed) ||
                parsed < 0 ||
                parsed > 23);
            const changed =
              (draft !== undefined && (invalid || parsed !== slot.startHour)) ||
              (activeDrafts[slot.id] !== undefined &&
                activeDrafts[slot.id] !== savedActive);

            return (
              <div
                key={slot.id}
                className={`grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2 ${
                  changed ? "bg-rose-50/40" : ""
                }`}
              >
                <div className="min-w-0">
                  <p
                    className={`truncate text-base font-semibold ${
                      active ? "text-stone-800" : "text-stone-400 line-through"
                    }`}
                  >
                    {slotLabel(slot.startHour)}
                  </p>
                  <p className="text-xs text-stone-400">Display label</p>
                </div>
                <label className="flex items-center gap-2">
                  <span className="text-xs text-stone-400">Hour</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={23}
                    value={value}
                    onChange={(e) => onSlotChange(slot.id, e.target.value)}
                    disabled={busy}
                    className={`w-20 rounded border px-2 py-1.5 text-right text-base tabular-nums disabled:bg-stone-100 ${
                      invalid ? "border-red-300 bg-red-50" : "border-stone-300"
                    }`}
                    aria-label={`${slotLabel(slot.startHour)} start hour`}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => onSlotActiveChange(slot.id, !active)}
                  disabled={busy}
                  className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
                    active ? "bg-emerald-500" : "bg-stone-300"
                  }`}
                  role="switch"
                  aria-checked={active}
                  aria-label={`${slotLabel(slot.startHour)} ${active ? "Active" : "Inactive"}`}
                >
                  <span
                    className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                      active ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {inactiveSlots.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50/70">
          <div className="border-b border-stone-200 px-3 py-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              Hidden Time Slots
            </h3>
          </div>
          <div className="divide-y divide-stone-100">
            {inactiveSlots.map((slot) => {
              const draft = drafts[slot.id];
              const value = draft ?? String(slot.startHour);
              const active = isActive(slot);
              const savedActive = slot.active ?? true;
              const parsed = Math.floor(Number(value.trim()));
              const invalid =
                draft !== undefined &&
                (!value.trim() ||
                  !Number.isFinite(parsed) ||
                  parsed < 0 ||
                  parsed > 23);
              const changed =
                (draft !== undefined &&
                  (invalid || parsed !== slot.startHour)) ||
                (activeDrafts[slot.id] !== undefined &&
                  activeDrafts[slot.id] !== savedActive);

              return (
                <div
                  key={slot.id}
                  className={`grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2 ${
                    changed ? "bg-rose-50/40" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-stone-400 line-through">
                      {slotLabel(slot.startHour)}
                    </p>
                    <p className="text-xs text-stone-400">Hidden from input</p>
                  </div>
                  <label className="flex items-center gap-2">
                    <span className="text-xs text-stone-400">Hour</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={23}
                      value={value}
                      onChange={(e) => onSlotChange(slot.id, e.target.value)}
                      disabled={busy}
                      className={`w-20 rounded border px-2 py-1.5 text-right text-base tabular-nums disabled:bg-stone-100 ${
                        invalid ? "border-red-300 bg-red-50" : "border-stone-300"
                      }`}
                      aria-label={`${slotLabel(slot.startHour)} start hour`}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => onSlotActiveChange(slot.id, !active)}
                    disabled={busy}
                    className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
                      active ? "bg-emerald-500" : "bg-stone-300"
                    }`}
                    role="switch"
                    aria-checked={active}
                    aria-label={`${slotLabel(slot.startHour)} ${active ? "Active" : "Inactive"}`}
                  >
                    <span
                      className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                        active ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-dashed border-stone-300 bg-white p-4">
        <label className="block text-sm font-semibold text-stone-700 mb-2">
          Add Time Slot
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={23}
            value={newStartHour}
            onChange={(e) => setNewStartHour(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSlot()}
            placeholder="14"
            className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-base"
          />
          <button
            type="button"
            onClick={addSlot}
            disabled={busy || !newStartHour.trim()}
            className="rounded-lg bg-rose-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function MembersSettings() {
  const [members, setMembers] = useState<StoreMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [activeDrafts, setActiveDrafts] = useState<Record<string, boolean>>({});

  const reload = useCallback(async () => {
    setMembers(await fetchMembers());
  }, []);

  useEffect(() => {
    fetchMembers()
      .then(setMembers)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      await reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handleInvite = async () => {
    const value = email.trim();
    if (!value) return;
    setEmail("");
    await run(() => inviteMember(value));
  };

  const changedMembers = useMemo(
    () =>
      members.flatMap((member) => {
        const active = activeDrafts[member.id];
        if (active === undefined || active === member.active) return [];
        return [{ id: member.id, active }];
      }),
    [members, activeDrafts],
  );

  const saveMemberChanges = async () => {
    if (changedMembers.length === 0) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await Promise.all(
        changedMembers.map((member) =>
          updateMember(member.id, { active: member.active }),
        ),
      );
      setActiveDrafts({});
      await reload();
      setMessage("Member changes saved.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || newPassword.length < 4) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await changeSettingsPassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Settings password updated.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-4 text-center text-sm text-stone-500">
        Loading members...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-stone-200 bg-white p-3">
        <h3 className="text-base font-bold text-stone-800">Add Member</h3>
        <p className="mt-1 text-xs text-stone-500">
          Add the email address here first. The member can then register or sign
          in with the same email.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="member@example.com"
            disabled={busy}
            className="rounded-lg border border-stone-300 px-3 py-2 text-base disabled:bg-stone-100"
          />
          <button
            type="button"
            onClick={handleInvite}
            disabled={busy || !email.trim()}
            className="rounded-lg bg-rose-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 break-all">
          {error}
        </p>
      )}

      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="border-b border-stone-200 bg-stone-50 px-3 py-2">
          <h3 className="text-base font-bold text-stone-800">Existing Members</h3>
        </div>
        <div className="divide-y divide-stone-100">
          {members.length === 0 && (
            <p className="px-3 py-4 text-sm text-stone-400">No members.</p>
          )}
          {members.map((member) => (
            <MemberRow
              key={`${member.id}:${member.role}`}
              member={member}
              busy={busy}
              active={activeDrafts[member.id] ?? member.active}
              changed={
                activeDrafts[member.id] !== undefined &&
                activeDrafts[member.id] !== member.active
              }
              onActiveChange={(active) => {
                setError("");
                setMessage("");
                setActiveDrafts((current) => ({ ...current, [member.id]: active }));
              }}
            />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-3">
        <h3 className="text-base font-bold text-stone-800">
          Change Settings Password
        </h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            disabled={busy}
            className="rounded-lg border border-stone-300 px-3 py-2 text-base disabled:bg-stone-100"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            disabled={busy}
            className="rounded-lg border border-stone-300 px-3 py-2 text-base disabled:bg-stone-100"
          />
        </div>
        <button
          type="button"
          onClick={handlePasswordChange}
          disabled={busy || !currentPassword || newPassword.length < 4}
          className="mt-3 rounded-lg bg-stone-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          Update Password
        </button>
      </div>

      <div className="fixed bottom-16 inset-x-0 z-20 border-t border-stone-200 bg-white/95 px-4 py-3 shadow-[0_-4px_18px_rgba(0,0,0,0.08)] backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          {message && (
            <p className="hidden text-sm font-semibold text-emerald-700 sm:block">
              {message}
            </p>
          )}
          <button
            type="button"
            onClick={saveMemberChanges}
            disabled={busy || changedMembers.length === 0}
            className="flex-1 rounded-xl bg-rose-800 px-4 py-3 text-base font-bold text-white shadow-sm disabled:bg-stone-300 disabled:text-stone-600"
          >
            {busy
              ? "Saving..."
              : changedMembers.length > 0
                ? `Save (${changedMembers.length} changes)`
                : "No changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MemberRow({
  member,
  busy,
  active,
  changed,
  onActiveChange,
}: {
  member: StoreMember;
  busy: boolean;
  active: boolean;
  changed: boolean;
  onActiveChange: (active: boolean) => void;
}) {
  const locked = busy || member.isCurrentUser;

  return (
    <div
      className={`grid gap-3 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${
        changed ? "bg-rose-50/40" : ""
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={`truncate text-base font-semibold ${
              active ? "text-stone-800" : "text-stone-400 line-through"
            }`}
          >
            {member.email}
          </p>
          {member.isCurrentUser && (
            <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-500">
              You
            </span>
          )}
        </div>
        <p className="text-xs text-stone-400">
          {active ? "Active" : "Inactive"}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onActiveChange(!active)}
        disabled={locked}
        className={`relative h-8 w-14 rounded-full transition-colors disabled:opacity-40 ${
          active ? "bg-emerald-500" : "bg-stone-300"
        }`}
        role="switch"
        aria-checked={active}
        aria-label={`${member.email} ${active ? "Active" : "Inactive"}`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            active ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function PriceChanges({
  cats,
  busy,
  drafts,
  onPriceChange,
}: {
  cats: AdminCategory[];
  busy: boolean;
  drafts: Record<string, string>;
  onPriceChange: (id: string, value: string) => void;
}) {
  return (
    <div className="space-y-3">
      {cats.map((cat) => (
        <details
          key={cat.id}
          className="group rounded-xl border border-stone-200 bg-white overflow-hidden"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-stone-50 px-3 py-2 border-b border-stone-200">
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-stone-800">
                {cat.name}
              </h3>
              <p className="text-xs text-stone-400">{cat.items.length} items</p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-stone-400 group-open:rotate-90">
              &gt;
            </span>
          </summary>
          <div className="divide-y divide-stone-100">
            {cat.items.length === 0 && (
              <p className="px-3 py-3 text-sm text-stone-400">
                No menu items.
              </p>
            )}
            {cat.items.map((it) => {
              const draft = drafts[it.id];
              const draftValue = draft?.trim() ?? "";
              const draftNumber = Number(draftValue);
              const invalid =
                draft !== undefined &&
                (!draftValue || !Number.isFinite(draftNumber) || draftNumber < 0);

              return (
                <PriceRow
                  key={it.id}
                  item={it}
                  busy={busy}
                  value={draft ?? String(it.priceAud)}
                  changed={
                    draft !== undefined && (invalid || draftNumber !== it.priceAud)
                  }
                  invalid={invalid}
                  onChange={(value) => onPriceChange(it.id, value)}
                />
              );
            })}
          </div>
        </details>
      ))}
    </div>
  );
}

function ProductCategoryCard({
  cat,
  busy,
  drafts,
  activeDrafts,
  onProductNameChange,
  onProductActiveChange,
  run,
}: {
  cat: AdminCategory;
  busy: boolean;
  drafts: Record<string, string>;
  activeDrafts: Record<string, boolean>;
  onProductNameChange: (id: string, value: string) => void;
  onProductActiveChange: (id: string, active: boolean) => void;
  run: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [newItem, setNewItem] = useState("");
  const isActive = (item: AdminCategory["items"][number]) =>
    activeDrafts[item.id] ?? item.active;
  const activeItems = cat.items.filter((item) => item.active);
  const inactiveItems = cat.items.filter((item) => !item.active);

  const addItem = async () => {
    const n = newItem.trim();
    if (!n) return;
    setNewItem("");
    await run(() => createItem(cat.id, n));
  };

  return (
    <details className="group rounded-xl border border-stone-200 bg-white overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-stone-50 px-3 py-2 border-b border-stone-200">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-stone-800">
            {cat.name}
          </h3>
          <p className="text-xs text-stone-400">{cat.items.length} items</p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-stone-400 group-open:rotate-90">
          &gt;
        </span>
      </summary>

      <div className="divide-y divide-stone-100">
        {activeItems.length === 0 && (
          <p className="px-3 py-3 text-sm text-stone-400">
            No active menu items.
          </p>
        )}
        {activeItems.map((it) => (
          <ProductRow
            key={it.id}
            item={it}
            busy={busy}
            value={drafts[it.id] ?? it.name}
            changed={
              (drafts[it.id] !== undefined && drafts[it.id].trim() !== it.name) ||
              (activeDrafts[it.id] !== undefined &&
                activeDrafts[it.id] !== it.active)
            }
            invalid={drafts[it.id] !== undefined && !drafts[it.id].trim()}
            onNameChange={(value) => onProductNameChange(it.id, value)}
            active={isActive(it)}
            onActiveChange={(active) => onProductActiveChange(it.id, active)}
          />
        ))}
      </div>

      <div className="flex gap-2 p-3 bg-stone-50/50">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder="Add menu item"
          className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-base"
        />
        <button
          onClick={addItem}
          disabled={busy || !newItem.trim()}
          className="rounded-lg bg-rose-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {inactiveItems.length > 0 && (
        <div className="border-t border-stone-200 bg-stone-50/70">
          <p className="px-3 pt-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
            Hidden Products
          </p>
          <div className="divide-y divide-stone-100">
            {inactiveItems.map((it) => (
              <ProductRow
                key={it.id}
                item={it}
                busy={busy}
                value={drafts[it.id] ?? it.name}
                changed={
                  (drafts[it.id] !== undefined &&
                    drafts[it.id].trim() !== it.name) ||
                  (activeDrafts[it.id] !== undefined &&
                    activeDrafts[it.id] !== it.active)
                }
                invalid={drafts[it.id] !== undefined && !drafts[it.id].trim()}
                onNameChange={(value) => onProductNameChange(it.id, value)}
                active={isActive(it)}
                onActiveChange={(active) => onProductActiveChange(it.id, active)}
              />
            ))}
          </div>
        </div>
      )}
    </details>
  );
}

function CategorySettingsCard({
  cat,
  busy,
  value,
  active,
  changed,
  onChange,
  onActiveChange,
}: {
  cat: AdminCategory;
  busy: boolean;
  value: string;
  active: boolean;
  changed: boolean;
  onChange: (value: string) => void;
  onActiveChange: (active: boolean) => void;
}) {
  const invalid = !value.trim();

  return (
    <div
      className={`rounded-xl border bg-white p-3 ${
        changed ? "border-rose-300 bg-rose-50/20" : "border-stone-200"
      }`}
    >
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={busy}
          className={`flex-1 rounded border px-2 py-1 text-base font-bold ${
            invalid ? "border-red-300 bg-red-50" : "border-stone-300"
          } ${active ? "text-stone-800" : "text-stone-400 line-through"}`}
          aria-label={`${cat.name} category name`}
        />
        <span className="text-xs text-stone-400">{cat.items.length} items</span>
        <button
          onClick={() => onActiveChange(!active)}
          disabled={busy}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
            active ? "bg-emerald-500" : "bg-stone-300"
          }`}
          role="switch"
          aria-checked={active}
          aria-label={`${cat.name} ${active ? "Active" : "Inactive"}`}
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              active ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
      <p className="mt-1 text-xs text-stone-400">
        {active ? "Active" : "Inactive"}
      </p>
      {changed && (
        <p className="mt-1 text-xs font-semibold text-rose-700">
          Pending change
        </p>
      )}
    </div>
  );
}

function ProductRow({
  item,
  busy,
  value,
  changed,
  invalid,
  onNameChange,
  active,
  onActiveChange,
}: {
  item: AdminCategory["items"][number];
  busy: boolean;
  value: string;
  changed: boolean;
  invalid: boolean;
  onNameChange: (value: string) => void;
  active: boolean;
  onActiveChange: (active: boolean) => void;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 ${
        changed ? "bg-rose-50/40" : ""
      }`}
    >
      <input
        value={value}
        onChange={(e) => onNameChange(e.target.value)}
        disabled={busy}
        className={`min-w-0 flex-1 rounded border px-2 py-1 text-base disabled:bg-stone-100 ${
          invalid ? "border-red-300 bg-red-50" : "border-stone-300"
        } ${active ? "text-stone-800" : "text-stone-400 line-through"}`}
        aria-label={`${item.name} product name`}
      />

      <button
        onClick={() => onActiveChange(!active)}
        disabled={busy}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
          active
            ? "bg-emerald-500"
            : "bg-stone-300"
        }`}
        role="switch"
        aria-checked={active}
        aria-label={`${item.name} ${active ? "Active" : "Inactive"}`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            active ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>

    </div>
  );
}

function PriceRow({
  item,
  busy,
  value,
  changed,
  invalid,
  onChange,
}: {
  item: AdminCategory["items"][number];
  busy: boolean;
  value: string;
  changed: boolean;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 ${
        changed ? "bg-rose-50/40" : ""
      }`}
    >
      <div className="min-w-0">
        <p
          className={`truncate text-base ${
            item.active ? "text-stone-800" : "text-stone-400 line-through"
          }`}
        >
          {item.name}
        </p>
        <p className="text-xs text-stone-400">Current Price</p>
      </div>
      <label className="flex items-center gap-1">
        <span className="text-sm text-stone-400">$</span>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={busy}
          className={`w-20 rounded border px-2 py-1.5 text-right text-base tabular-nums disabled:bg-stone-100 ${
            invalid ? "border-red-300 bg-red-50" : "border-stone-300"
          }`}
          aria-label={`${item.name} current price AUD`}
        />
      </label>
    </div>
  );
}
