"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createCategory,
  createItem,
  changeSettingsPassword,
  fetchMembers,
  fetchAdminCategories,
  inviteMember,
  lockSettings,
  unlockSettings,
  updateCategory,
  updateItem,
  updateMember,
} from "@/lib/api";
import type { AdminCategory, StoreMember } from "@/lib/types";

type SettingsSection = "prices" | "products" | "categories" | "users";

type SettingsDrafts = {
  prices: Record<string, string>;
  productNames: Record<string, string>;
  categoryNames: Record<string, string>;
};

const emptyDrafts = (): SettingsDrafts => ({
  prices: {},
  productNames: {},
  categoryNames: {},
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
      id: "users",
      label: "Access Members",
      description: "Add people who can sign in to this store.",
    },
  ];

export default function SettingsTab() {
  const [cats, setCats] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState<SettingsSection>("prices");
  const [drafts, setDrafts] = useState<SettingsDrafts>(() => emptyDrafts());
  const [savedMessage, setSavedMessage] = useState("");

  const reload = useCallback(async () => {
    try {
      setCats(await fetchAdminCategories());
      setUnlocked(true);
    } catch (e) {
      setError(String(e));
    }
  }, []);

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
      await reload();
    } catch (e) {
      setError(String(e));
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

  const pendingChanges =
    changedPrices.length + changedProductNames.length + changedCategoryNames.length;
  const hasInvalidDraft =
    changedPrices.some((change) => change.invalid) ||
    changedProductNames.some((change) => change.invalid) ||
    changedCategoryNames.some((change) => change.invalid);

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
      await Promise.all([
        ...changedPrices.map((change) =>
          updateItem(change.id, { priceAud: change.priceAud }),
        ),
        ...changedProductNames.map((change) =>
          updateItem(change.id, { name: change.name }),
        ),
        ...changedCategoryNames.map((change) =>
          updateCategory(change.id, { name: change.name }),
        ),
      ]);
      setDrafts(emptyDrafts());
      await reload();
      setSavedMessage("Changes saved.");
    } catch (e) {
      setError(String(e));
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

  if (loading) {
    return <div className="p-6 text-center text-stone-500">Loading...</div>;
  }

  if (!unlocked) {
    return (
      <SettingsUnlockScreen
        error={error}
        onUnlock={async (password) => {
          setLoading(true);
          setError("");
          try {
            await unlockSettings(password);
            setCats(await fetchAdminCategories());
            setUnlocked(true);
          } catch (e) {
            setError(String(e));
          } finally {
            setLoading(false);
          }
        }}
      />
    );
  }

  return (
    <div className="pb-24 px-4 py-4 space-y-4">
      <p className="text-sm text-stone-500">
        Manage menu setup by price, product, and category.
      </p>

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-stone-200 bg-white p-1 sm:grid-cols-4">
        {SETTINGS_SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={`rounded-lg px-2 py-2 text-center text-sm font-semibold transition-colors ${
              section === s.id
                ? "bg-rose-800 text-white"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-stone-500">
        {SETTINGS_SECTIONS.find((s) => s.id === section)?.description}
      </p>

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600 break-all">
          {error}
        </p>
      )}

      {section === "prices" && (
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

      {section === "products" &&
        cats.map((cat) => (
          <ProductCategoryCard
            key={cat.id}
            cat={cat}
            busy={busy}
            drafts={drafts.productNames}
            onProductNameChange={(id, value) => {
              setSavedMessage("");
              setDrafts((current) => ({
                ...current,
                productNames: { ...current.productNames, [id]: value },
              }));
            }}
            run={run}
          />
        ))}

      {section === "categories" && (
        <>
          {cats.map((cat) => (
            <CategorySettingsCard
              key={cat.id}
              cat={cat}
              value={drafts.categoryNames[cat.id] ?? cat.name}
              changed={
                drafts.categoryNames[cat.id] !== undefined &&
                drafts.categoryNames[cat.id].trim() !== cat.name
              }
              onChange={(value) => {
                setSavedMessage("");
                setDrafts((current) => ({
                  ...current,
                  categoryNames: { ...current.categoryNames, [cat.id]: value },
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
        </>
      )}

      {section === "users" && <MembersSettings />}

      {section !== "users" && (
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
  onUnlock,
}: {
  error: string;
  onUnlock: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

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
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Settings password"
          className="mt-4 w-full rounded-lg border border-stone-300 px-3 py-3 text-base"
          autoFocus
        />
        {error && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-600 break-all">
            {error}
          </p>
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

function MembersSettings() {
  const [members, setMembers] = useState<StoreMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  const reload = useCallback(async () => {
    setMembers(await fetchMembers());
  }, []);

  useEffect(() => {
    fetchMembers()
      .then(setMembers)
      .catch((e) => setError(String(e)))
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
      setError(String(e));
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
      setError(String(e));
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
              key={`${member.id}:${member.role}:${member.active}`}
              member={member}
              busy={busy}
              run={run}
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
    </div>
  );
}

function MemberRow({
  member,
  busy,
  run,
}: {
  member: StoreMember;
  busy: boolean;
  run: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const locked = busy || member.isCurrentUser;

  return (
    <div className="grid gap-3 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={`truncate text-base font-semibold ${
              member.active ? "text-stone-800" : "text-stone-400 line-through"
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
          {member.active ? "Active" : "Inactive"}
        </p>
      </div>

      <button
        type="button"
        onClick={() => run(() => updateMember(member.id, { active: !member.active }))}
        disabled={locked}
        className={`relative h-8 w-14 rounded-full transition-colors disabled:opacity-40 ${
          member.active ? "bg-emerald-500" : "bg-stone-300"
        }`}
        role="switch"
        aria-checked={member.active}
        aria-label={`${member.email} ${member.active ? "Active" : "Inactive"}`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            member.active ? "translate-x-6" : "translate-x-1"
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
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Current Price updates affect amount calculations. Price history will be
        added in the next improvement.
      </div>
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
  onProductNameChange,
  run,
}: {
  cat: AdminCategory;
  busy: boolean;
  drafts: Record<string, string>;
  onProductNameChange: (id: string, value: string) => void;
  run: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [newItem, setNewItem] = useState("");

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
        {cat.items.length === 0 && (
          <p className="px-3 py-3 text-sm text-stone-400">
            No menu items.
          </p>
        )}
        {cat.items.map((it) => (
          <ProductRow
            key={it.id}
            item={it}
            busy={busy}
            value={drafts[it.id] ?? it.name}
            changed={
              drafts[it.id] !== undefined && drafts[it.id].trim() !== it.name
            }
            invalid={drafts[it.id] !== undefined && !drafts[it.id].trim()}
            onNameChange={(value) => onProductNameChange(it.id, value)}
            run={run}
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
    </details>
  );
}

function CategorySettingsCard({
  cat,
  value,
  changed,
  onChange,
}: {
  cat: AdminCategory;
  value: string;
  changed: boolean;
  onChange: (value: string) => void;
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
          className={`flex-1 rounded border px-2 py-1 text-base font-bold ${
            invalid ? "border-red-300 bg-red-50" : "border-stone-300"
          }`}
          aria-label={`${cat.name} category name`}
        />
        <span className="text-xs text-stone-400">{cat.items.length} items</span>
      </div>
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
  run,
}: {
  item: AdminCategory["items"][number];
  busy: boolean;
  value: string;
  changed: boolean;
  invalid: boolean;
  onNameChange: (value: string) => void;
  run: (fn: () => Promise<unknown>) => Promise<void>;
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
        } ${item.active ? "text-stone-800" : "text-stone-400 line-through"}`}
        aria-label={`${item.name} product name`}
      />

      <button
        onClick={() => run(() => updateItem(item.id, { active: !item.active }))}
        disabled={busy}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
          item.active
            ? "bg-emerald-500"
            : "bg-stone-300"
        }`}
        role="switch"
        aria-checked={item.active}
        aria-label={`${item.name} ${item.active ? "Active" : "Inactive"}`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            item.active ? "translate-x-6" : "translate-x-1"
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
