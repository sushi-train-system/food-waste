"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchData } from "@/lib/api";
import { formatAud, slotLabel, WEEKDAY_LABELS } from "@/lib/config";
import type { DailyRow, RawRow } from "@/lib/types";

type View = "raw" | "daily";

export default function DataTab() {
  const [view, setView] = useState<View>("daily");
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [dailyRows, setDailyRows] = useState<DailyRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    setSelectedCat(null);
    fetchData(view, {})
      .then((res) => {
        if (view === "raw") {
          setRawRows(res.rows as RawRow[]);
        } else {
          const rows = res.rows as DailyRow[];
          setDailyRows(rows);
          const cats = new Set<string>();
          rows.forEach((r) =>
            Object.keys(r.byCategory).forEach((c) => cats.add(c)),
          );
          setCategories([...cats]);
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [view]);

  // 選択ジャンル内の全商品名（列ヘッダー用）
  const itemNames = useMemo(() => {
    if (!selectedCat) return [];
    const names = new Set<string>();
    for (const row of dailyRows) {
      const cat = row.byCategory[selectedCat];
      if (cat) cat.items.forEach((it) => names.add(it.menuName));
    }
    return [...names];
  }, [dailyRows, selectedCat]);

  const downloadCsv = () => {
    let csv = "";
    if (view === "raw") {
      csv =
        "date,slot,category,menu,quantity,price_aud,amount_aud\n";
      csv += rawRows
        .map(
          (r) =>
            `${r.date},${r.slot},${r.categoryName},${r.menuName},${r.quantity},${r.priceAud},${r.amount}`,
        )
        .join("\n");
    } else if (selectedCat) {
      csv = `date,weekday,${itemNames.join(",")},genre_total,genre_amount\n`;
      csv += dailyRows
        .map((r) => {
          const cat = r.byCategory[selectedCat];
          const items = itemNames
            .map((n) => cat?.items.find((i) => i.menuName === n)?.quantity ?? 0)
            .join(",");
          return `${r.date},${WEEKDAY_LABELS[r.weekday]},${items},${cat?.quantity ?? 0},${cat?.amount ?? 0}`;
        })
        .join("\n");
    } else {
      csv = `date,weekday,total,total_amount,${categories.join(",")}\n`;
      csv += dailyRows
        .map((r) => {
          const cats = categories
            .map((c) => r.byCategory[c]?.quantity ?? 0)
            .join(",");
          return `${r.date},${WEEKDAY_LABELS[r.weekday]},${r.total},${r.totalAmount},${cats}`;
        })
        .join("\n");
    }
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sushi-waste-${view}${selectedCat ? `-${selectedCat}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pb-24">
      <div className="sticky top-14 z-10 bg-stone-100/95 backdrop-blur border-b border-stone-200 px-4 py-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <TabBtn active={view === "raw"} onClick={() => setView("raw")}>
              2時間ごと
            </TabBtn>
            <TabBtn active={view === "daily"} onClick={() => setView("daily")}>
              日次集計
            </TabBtn>
          </div>
          <button
            onClick={downloadCsv}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 active:bg-stone-100"
          >
            CSV
          </button>
        </div>

        {/* ジャンル選択（日次集計のみ） */}
        {view === "daily" && categories.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
            <CatChip
              active={selectedCat === null}
              onClick={() => setSelectedCat(null)}
            >
              すべて
            </CatChip>
            {categories.map((c) => (
              <CatChip
                key={c}
                active={selectedCat === c}
                onClick={() => setSelectedCat(selectedCat === c ? null : c)}
              >
                {c}
              </CatChip>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="p-6 text-center text-stone-500">読込中…</div>
      )}
      {error && <p className="px-4 pt-4 text-sm text-red-600">{error}</p>}

      {!loading && view === "raw" && (
        <div className="px-3 py-3">
          {rawRows.length === 0 ? (
            <Empty />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-stone-500 text-xs">
                  <tr>
                    <Th>日付</Th>
                    <Th>時間帯</Th>
                    <Th>ジャンル</Th>
                    <Th>メニュー</Th>
                    <Th right>個数</Th>
                    <Th right>単価</Th>
                    <Th right>金額</Th>
                  </tr>
                </thead>
                <tbody>
                  {rawRows.map((r, i) => (
                    <tr key={i} className="border-t border-stone-100">
                      <Td>{r.date}</Td>
                      <Td>{slotLabel(r.slot)}</Td>
                      <Td>{r.categoryName}</Td>
                      <Td>{r.menuName}</Td>
                      <Td right>
                        <span className="font-semibold tabular-nums">
                          {r.quantity}
                        </span>
                      </Td>
                      <Td right>
                        <span className="tabular-nums text-stone-500">
                          {formatAud(r.priceAud)}
                        </span>
                      </Td>
                      <Td right>
                        <span className="font-semibold tabular-nums text-rose-800">
                          {formatAud(r.amount)}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!loading && view === "daily" && !selectedCat && (
        <div className="px-3 py-3">
          {dailyRows.length === 0 ? (
            <Empty />
          ) : (
            <>
              <p className="text-xs text-stone-500 mb-2 px-1">
                ジャンルをタップすると商品別に表示されます
              </p>
              <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 text-stone-500 text-xs">
                    <tr>
                      <Th>日付</Th>
                      <Th>曜</Th>
                      {categories.map((c) => (
                        <Th key={c} right>
                          <button
                            onClick={() => setSelectedCat(c)}
                            className="text-rose-700 underline decoration-dotted"
                          >
                            {c}
                          </button>
                        </Th>
                      ))}
                      <Th right>合計</Th>
                      <Th right>金額</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyRows.map((r) => (
                      <tr key={r.date} className="border-t border-stone-100">
                        <Td>{r.date.slice(5)}</Td>
                        <Td>
                          <Wd weekday={r.weekday} />
                        </Td>
                        {categories.map((c) => (
                          <Td key={c} right>
                            <button
                              onClick={() => setSelectedCat(c)}
                              className="tabular-nums text-stone-600 hover:text-rose-800"
                            >
                              {r.byCategory[c]?.quantity ?? 0}
                            </button>
                          </Td>
                        ))}
                        <Td right>
                          <span className="font-bold tabular-nums">
                            {r.total}
                          </span>
                        </Td>
                        <Td right>
                          <span className="font-bold tabular-nums text-rose-800">
                            {formatAud(r.totalAmount)}
                          </span>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {!loading && view === "daily" && selectedCat && (
        <div className="px-3 py-3">
          <p className="text-sm font-semibold text-stone-700 mb-2 px-1">
            {selectedCat}
            <button
              onClick={() => setSelectedCat(null)}
              className="ml-2 text-xs text-stone-400 font-normal"
            >
              ← 戻る
            </button>
          </p>
          {dailyRows.length === 0 ? (
            <Empty />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-stone-500 text-xs">
                  <tr>
                    <Th>日付</Th>
                    <Th>曜</Th>
                    {itemNames.map((n) => (
                      <Th key={n} right>
                        {n}
                      </Th>
                    ))}
                    <Th right>小計</Th>
                    <Th right>金額</Th>
                  </tr>
                </thead>
                <tbody>
                  {dailyRows.map((r) => {
                    const cat = r.byCategory[selectedCat];
                    return (
                      <tr key={r.date} className="border-t border-stone-100">
                        <Td>{r.date.slice(5)}</Td>
                        <Td>
                          <Wd weekday={r.weekday} />
                        </Td>
                        {itemNames.map((n) => {
                          const it = cat?.items.find(
                            (i) => i.menuName === n,
                          );
                          return (
                            <Td key={n} right>
                              <span
                                className={`tabular-nums ${
                                  it && it.quantity > 0
                                    ? "font-medium text-stone-800"
                                    : "text-stone-300"
                                }`}
                              >
                                {it?.quantity ?? 0}
                              </span>
                            </Td>
                          );
                        })}
                        <Td right>
                          <span className="font-bold tabular-nums">
                            {cat?.quantity ?? 0}
                          </span>
                        </Td>
                        <Td right>
                          <span className="font-bold tabular-nums text-rose-800">
                            {formatAud(cat?.amount ?? 0)}
                          </span>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CatChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
        active
          ? "bg-rose-800 text-white"
          : "bg-white text-stone-600 border border-stone-300"
      }`}
    >
      {children}
    </button>
  );
}

function Wd({ weekday }: { weekday: number }) {
  return (
    <span
      className={
        weekday === 0
          ? "text-rose-600"
          : weekday === 6
            ? "text-blue-600"
            : ""
      }
    >
      {WEEKDAY_LABELS[weekday]}
    </span>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-rose-800 text-white"
          : "bg-white text-stone-600 border border-stone-300"
      }`}
    >
      {children}
    </button>
  );
}

function Th({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: boolean;
}) {
  return (
    <th
      className={`px-2 py-2 font-medium whitespace-nowrap ${
        right ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: boolean;
}) {
  return (
    <td
      className={`px-2 py-2 whitespace-nowrap ${right ? "text-right" : "text-left"}`}
    >
      {children}
    </td>
  );
}

function Empty() {
  return (
    <p className="rounded-xl bg-white border border-stone-200 p-6 text-center text-stone-500">
      データがまだありません。入力タブから廃棄数を記録してください。
    </p>
  );
}
