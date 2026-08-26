"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createCategory,
  createItem,
  fetchAdminCategories,
  updateCategory,
  updateItem,
} from "@/lib/api";
import type { AdminCategory } from "@/lib/types";

type SettingsSection = "prices" | "products" | "categories";

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
  ];

export default function SettingsTab() {
  const [cats, setCats] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState<SettingsSection>("prices");

  const reload = useCallback(async () => {
    try {
      setCats(await fetchAdminCategories());
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    fetchAdminCategories()
      .then(setCats)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await reload();
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

  return (
    <div className="pb-24 px-4 py-4 space-y-4">
      <p className="text-sm text-stone-500">
        Manage menu setup by price, product, and category.
      </p>

      <div className="grid grid-cols-3 gap-2 rounded-xl border border-stone-200 bg-white p-1">
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

      {section === "prices" && <PriceChanges cats={cats} busy={busy} run={run} />}

      {section === "products" &&
        cats.map((cat) => (
          <ProductCategoryCard key={cat.id} cat={cat} busy={busy} run={run} />
        ))}

      {section === "categories" && (
        <>
          {cats.map((cat) => (
            <CategorySettingsCard key={cat.id} cat={cat} run={run} />
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
    </div>
  );
}

function PriceChanges({
  cats,
  busy,
  run,
}: {
  cats: AdminCategory[];
  busy: boolean;
  run: (fn: () => Promise<unknown>) => Promise<void>;
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
            {cat.items.map((it) => (
              <PriceRow
                key={`${it.id}:${it.priceAud}`}
                item={it}
                busy={busy}
                run={run}
              />
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function ProductCategoryCard({
  cat,
  busy,
  run,
}: {
  cat: AdminCategory;
  busy: boolean;
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
            key={`${it.id}:${it.name}:${it.active}`}
            item={it}
            busy={busy}
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
  run,
}: {
  cat: AdminCategory;
  run: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(cat.name);

  const saveName = async () => {
    setEditingName(false);
    if (name.trim() && name.trim() !== cat.name) {
      await run(() => updateCategory(cat.id, { name: name.trim() }));
    } else {
      setName(cat.name);
    }
  };

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3">
      <div className="flex items-center gap-2">
        {editingName ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === "Enter" && saveName()}
            className="flex-1 rounded border border-stone-300 px-2 py-1 text-base font-bold"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingName(true)}
            className="flex-1 text-left text-base font-bold text-stone-800"
          >
            {cat.name}
            <span className="ml-2 text-xs font-normal text-stone-400">
              Edit
            </span>
          </button>
        )}
        <span className="text-xs text-stone-400">{cat.items.length} items</span>
      </div>
    </div>
  );
}

function ProductRow({
  item,
  busy,
  run,
}: {
  item: AdminCategory["items"][number];
  busy: boolean;
  run: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);

  const save = async () => {
    setEditing(false);
    if (name.trim() && name.trim() !== item.name) {
      await run(() => updateItem(item.id, { name: name.trim() }));
    } else {
      setName(item.name);
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === "Enter" && save()}
          className="flex-1 rounded border border-stone-300 px-2 py-1 text-base min-w-0"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className={`flex-1 text-left text-base min-w-0 truncate ${
            item.active ? "text-stone-800" : "text-stone-400 line-through"
          }`}
        >
          {item.name}
        </button>
      )}

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
  run,
}: {
  item: AdminCategory["items"][number];
  busy: boolean;
  run: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [price, setPrice] = useState(String(item.priceAud));

  const savePrice = async () => {
    const p = parseFloat(price);
    if (!isNaN(p) && p >= 0 && p !== item.priceAud) {
      await run(() => updateItem(item.id, { priceAud: p }));
    } else {
      setPrice(String(item.priceAud));
    }
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2">
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
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onBlur={savePrice}
          onKeyDown={(e) => e.key === "Enter" && savePrice()}
          disabled={busy}
          className="w-20 rounded border border-stone-300 px-2 py-1.5 text-right text-base tabular-nums disabled:bg-stone-100"
          aria-label={`${item.name} current price AUD`}
        />
      </label>
    </div>
  );
}
