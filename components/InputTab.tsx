"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TIME_SLOTS,
  currentSlot,
  slotLabel,
  todayStr,
  WEEKDAY_LABELS,
  weekdayIndexFromDate,
} from "@/lib/config";
import { fetchEntries, fetchMenu, saveEntries } from "@/lib/api";
import type { CategoryDTO } from "@/lib/types";

/** メニュー全件を 0 で初期化し、サーバー保存値で上書きする */
function buildQuantities(
  menu: CategoryDTO[],
  entries: { menuItemId: string; quantity: number }[],
): Record<string, number> {
  const q: Record<string, number> = {};
  for (const c of menu) for (const it of c.items) q[it.id] = 0;
  for (const e of entries) q[e.menuItemId] = e.quantity;
  return q;
}

export default function InputTab() {
  const [menu, setMenu] = useState<CategoryDTO[]>([]);
  const [activeCat, setActiveCat] = useState<string>("");
  const [date, setDate] = useState<string>(() => todayStr());
  const [slot, setSlot] = useState<number>(() => currentSlot());
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  /** サーバー保存済みの値（変更検知の基準） */
  const [savedQuantities, setSavedQuantities] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMenu()
      .then((cats) => {
        setMenu(cats);
        if (cats.length > 0) setActiveCat(cats[0].slug);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const applyServerEntries = useCallback(
    (entries: { menuItemId: string; quantity: number }[]) => {
      const q = buildQuantities(menu, entries);
      setQuantities(q);
      setSavedQuantities(q);
    },
    [menu],
  );

  const loadEntries = useCallback(() => {
    if (menu.length === 0) return;
    fetchEntries(date, slot)
      .then((res) => applyServerEntries(res.entries))
      .catch((e) => setError(String(e)));
  }, [date, slot, menu, applyServerEntries]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const activeCategory = useMemo(
    () => menu.find((c) => c.slug === activeCat),
    [menu, activeCat],
  );

  const categoryTotal = (cat: CategoryDTO) =>
    cat.items.reduce((sum, it) => sum + (quantities[it.id] ?? 0), 0);

  const grandTotal = menu.reduce((s, c) => s + categoryTotal(c), 0);

  const isChanged = (id: string) =>
    (quantities[id] ?? 0) !== (savedQuantities[id] ?? 0);

  const changedCount = useMemo(
    () =>
      menu
        .flatMap((c) => c.items)
        .filter(
          (it) =>
            (quantities[it.id] ?? 0) !== (savedQuantities[it.id] ?? 0),
        ).length,
    [menu, quantities, savedQuantities],
  );

  const setQty = (id: string, value: number) => {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, value) }));
    setMessage("");
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const entries = menu.flatMap((c) =>
        c.items
          .filter((it) => isChanged(it.id))
          .map((it) => ({
            menuItemId: it.id,
            quantity: quantities[it.id] ?? 0,
          })),
      );
      await saveEntries({ date, slot, entries });
      setSavedQuantities(quantities);
      setMessage("保存しました");
      setTimeout(() => setMessage(""), 2500);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-stone-500">読み込み中…</div>;
  }

  const weekday = WEEKDAY_LABELS[weekdayIndexFromDate(date)];

  return (
    <div className="pb-28">
      <div className="sticky top-14 z-10 bg-stone-100/95 backdrop-blur border-b border-stone-200 px-4 py-3 space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-base"
          />
          <span className="text-sm font-medium text-rose-800 w-10 text-center">
            {weekday}曜
          </span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
          {TIME_SLOTS.map((s) => (
            <button
              key={s}
              onClick={() => setSlot(s)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                slot === s
                  ? "bg-rose-800 text-white shadow"
                  : "bg-white text-stone-600 border border-stone-300"
              }`}
            >
              {slotLabel(s)}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-lg bg-white border border-stone-200 px-3 py-2">
          <span className="text-xs text-stone-500">この時間帯の廃棄</span>
          <span className="text-sm font-bold text-rose-800 tabular-nums">
            {grandTotal} 個
          </span>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 py-3 -mx-0">
        {menu.map((c) => {
          const t = categoryTotal(c);
          return (
            <button
              key={c.slug}
              onClick={() => setActiveCat(c.slug)}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                activeCat === c.slug
                  ? "bg-stone-900 text-white"
                  : "bg-white text-stone-700 border border-stone-200"
              }`}
            >
              {c.name}
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs tabular-nums ${
                  activeCat === c.slug
                    ? "bg-white/25"
                    : t > 0
                      ? "bg-rose-100 text-rose-800"
                      : "bg-stone-100 text-stone-400"
                }`}
              >
                {t}
              </span>
            </button>
          );
        })}
      </div>

      <div className="px-4 space-y-2">
        {activeCategory?.items.map((it) => {
          const q = quantities[it.id] ?? 0;
          const changed = isChanged(it.id);
          return (
            <div
              key={it.id}
              className={`flex items-center justify-between rounded-xl border bg-white px-4 py-3 transition-colors ${
                changed
                  ? "border-rose-500 ring-1 ring-rose-200"
                  : "border-stone-200"
              }`}
            >
              <span className="text-base font-medium">{it.name}</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQty(it.id, q - 1)}
                  disabled={q <= 0}
                  className="h-10 w-10 rounded-full bg-stone-100 text-2xl leading-none text-stone-700 disabled:opacity-30 active:bg-stone-200"
                  aria-label="減らす"
                >
                  −
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={q}
                  onChange={(e) =>
                    setQty(it.id, Math.floor(Number(e.target.value) || 0))
                  }
                  className="w-12 text-center text-lg font-semibold tabular-nums bg-transparent"
                />
                <button
                  onClick={() => setQty(it.id, q + 1)}
                  className="h-10 w-10 rounded-full bg-rose-800 text-2xl leading-none text-white active:bg-rose-900"
                  aria-label="増やす"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="px-4 pt-4 text-sm text-red-600 break-all">{error}</p>
      )}

      <div className="fixed bottom-16 inset-x-0 z-20 px-4 py-3 bg-gradient-to-t from-stone-100 via-stone-100 to-transparent">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-rose-800 py-3.5 text-center text-base font-bold text-white shadow-lg active:bg-rose-900 disabled:opacity-60"
        >
          {saving
            ? "保存中…"
            : message
              ? message
              : changedCount > 0
                ? `保存（${changedCount}件変更 / 合計 ${grandTotal} 個）`
                : `この時間帯を保存（合計 ${grandTotal} 個）`}
        </button>
      </div>
    </div>
  );
}
