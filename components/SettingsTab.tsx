"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createCategory,
  createItem,
  deleteCategory,
  deleteItem,
  fetchAdminCategories,
  updateCategory,
  updateItem,
} from "@/lib/api";
import type { AdminCategory } from "@/lib/types";

export default function SettingsTab() {
  const [cats, setCats] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [busy, setBusy] = useState(false);

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
        Edit categories and menu items to match your store.
      </p>

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600 break-all">
          {error}
        </p>
      )}

      {cats.map((cat) => (
        <CategoryCard key={cat.id} cat={cat} busy={busy} run={run} />
      ))}

      {/* カテゴリ追加 */}
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
    </div>
  );
}

function CategoryCard({
  cat,
  busy,
  run,
}: {
  cat: AdminCategory;
  busy: boolean;
  run: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(cat.name);
  const [newItem, setNewItem] = useState("");

  const saveName = async () => {
    setEditingName(false);
    if (name.trim() && name.trim() !== cat.name) {
      await run(() => updateCategory(cat.id, { name: name.trim() }));
    } else {
      setName(cat.name);
    }
  };

  const addItem = async () => {
    const n = newItem.trim();
    if (!n) return;
    setNewItem("");
    await run(() => createItem(cat.id, n));
  };

  const removeCategory = async () => {
    if (
      confirm(
        `Delete category "${cat.name}"?\nAll menu items and saved waste entries under this category will also be deleted.`,
      )
    ) {
      await run(() => deleteCategory(cat.id));
    }
  };

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 bg-stone-50 px-3 py-2 border-b border-stone-200">
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
            onClick={() => setEditingName(true)}
            className="flex-1 text-left text-base font-bold text-stone-800"
          >
            {cat.name}
            <span className="ml-2 text-xs font-normal text-stone-400">
              Edit
            </span>
          </button>
        )}
        <button
          onClick={removeCategory}
          disabled={busy}
          className="text-xs text-red-500 px-2 py-1"
        >
          Delete
        </button>
      </div>

      {/* メニュー一覧 */}
      <div className="divide-y divide-stone-100">
        {cat.items.length === 0 && (
          <p className="px-3 py-3 text-sm text-stone-400">
            No menu items.
          </p>
        )}
        {cat.items.map((it) => (
          <ItemRow key={it.id} item={it} busy={busy} run={run} />
        ))}
      </div>

      {/* メニュー追加 */}
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
    </div>
  );
}

function ItemRow({
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
  const [price, setPrice] = useState(String(item.priceAud));

  const save = async () => {
    setEditing(false);
    const updates: { name?: string; priceAud?: number } = {};
    if (name.trim() && name.trim() !== item.name) updates.name = name.trim();
    const p = parseFloat(price);
    if (!isNaN(p) && p >= 0 && p !== item.priceAud) updates.priceAud = p;
    if (Object.keys(updates).length > 0) {
      await run(() => updateItem(item.id, updates));
    } else {
      setName(item.name);
      setPrice(String(item.priceAud));
    }
  };

  const savePrice = async () => {
    const p = parseFloat(price);
    if (!isNaN(p) && p >= 0 && p !== item.priceAud) {
      await run(() => updateItem(item.id, { priceAud: p }));
    } else {
      setPrice(String(item.priceAud));
    }
  };

  const remove = async () => {
    if (
      confirm(
        `Delete "${item.name}"?\nSaved waste entries will also be deleted.\nChoose "Inactive" instead if you want to keep the history.`,
      )
    ) {
      await run(() => deleteItem(item.id));
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

      {/* 単価（AUD） */}
      <div className="flex items-center gap-0.5 shrink-0">
        <span className="text-xs text-stone-400">$</span>
        <input
          type="number"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onBlur={savePrice}
          onKeyDown={(e) => e.key === "Enter" && savePrice()}
          className="w-14 rounded border border-stone-300 px-1.5 py-1 text-sm text-right tabular-nums"
          aria-label="Unit price AUD"
        />
      </div>

      {/* 有効/無効トグル */}
      <button
        onClick={() => run(() => updateItem(item.id, { active: !item.active }))}
        disabled={busy}
        className={`text-xs rounded-full px-2.5 py-1 font-medium ${
          item.active
            ? "bg-emerald-100 text-emerald-700"
            : "bg-stone-200 text-stone-500"
        }`}
      >
        {item.active ? "Active" : "Inactive"}
      </button>

      <button
        onClick={remove}
        disabled={busy}
        className="text-xs text-red-500 px-1.5 py-1"
        aria-label="Delete"
      >
        Delete
      </button>
    </div>
  );
}
