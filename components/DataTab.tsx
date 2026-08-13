"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchData } from "@/lib/api";
import MonthPicker from "./MonthPicker";
import {
  formatAud,
  formatDateLabel,
  formatMonthLabel,
  slotLabel,
  todayStr,
} from "@/lib/config";
import type { RawRow } from "@/lib/types";

function csvCell(value: string | number) {
  const s = String(value);
  if (!/[",\n]/.test(s)) return s;
  return `"${s.replaceAll('"', '""')}"`;
}

function monthValue(date = todayStr()) {
  return date.slice(0, 7);
}

function monthRangeFromValue(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const lastDay = new Date(year, monthIndex, 0).getDate();
  return {
    start: `${month}-01`,
    end: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

function rawGroupLabels(rows: RawRow[], index: number) {
  const row = rows[index];
  const prev = rows[index - 1];
  const sameDate = prev?.date === row.date;
  const sameSlot = sameDate && prev.slot === row.slot;
  const sameCategory = sameSlot && prev.categoryName === row.categoryName;
  return {
    date: sameDate ? "" : row.date,
    slot: sameSlot ? "" : slotLabel(row.slot),
    category: sameCategory ? "" : row.categoryName,
  };
}

export default function DataTab() {
  const [month, setMonth] = useState(() => monthValue());
  const [rows, setRows] = useState<RawRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const range = useMemo(() => monthRangeFromValue(month), [month]);

  useEffect(() => {
    fetchData("raw", range)
      .then((res) => setRows(res.rows as RawRow[]))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [range]);

  const totalQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);
  const totalAmount = rows.reduce((sum, row) => sum + row.amount, 0);

  const downloadCsv = () => {
    let csv = "date,time_slot,category,menu,quantity,price_aud,amount_aud\n";
    csv += rows
      .map((row, i) => {
        const labels = rawGroupLabels(rows, i);
        return [
          labels.date,
          labels.slot,
          labels.category,
          row.menuName,
          row.quantity,
          row.priceAud,
          row.amount,
        ]
          .map(csvCell)
          .join(",");
      })
      .join("\n");
    if (rows.length > 0) {
      csv += `\n${["Total", "", "", "", totalQuantity, "", totalAmount]
        .map(csvCell)
        .join(",")}`;
    }

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sushi-waste-2hour-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pb-24">
      <div className="sticky top-14 z-10 space-y-3 border-b border-stone-200 bg-stone-100/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <MonthPicker
              value={month}
              onChange={(value) => {
                setLoading(true);
                setError("");
                setMonth(value || monthValue());
              }}
            />
          </div>
          <button
            onClick={downloadCsv}
            disabled={rows.length === 0}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 disabled:opacity-40 active:bg-stone-100"
          >
            CSV
          </button>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2">
          <span className="text-xs text-stone-500">
            {formatMonthLabel(month)} ({formatDateLabel(range.start)} -{" "}
            {formatDateLabel(range.end)})
          </span>
          <span className="text-sm font-bold tabular-nums text-rose-800">
            {totalQuantity} pcs / {formatAud(totalAmount)}
          </span>
        </div>
      </div>

      {loading && (
        <div className="p-6 text-center text-stone-500">Loading...</div>
      )}
      {error && <p className="px-4 pt-4 text-sm text-red-600">{error}</p>}

      {!loading && (
        <div className="px-3 py-3">
          {rows.length === 0 ? (
            <Empty />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs text-stone-500">
                  <tr>
                    <Th>Date</Th>
                    <Th>Time Slot</Th>
                    <Th>Category</Th>
                    <Th>Menu</Th>
                    <Th right>Qty</Th>
                    <Th right>Unit Price</Th>
                    <Th right>Amount</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const labels = rawGroupLabels(rows, i);
                    return (
                      <tr key={i} className="border-t border-stone-100">
                        <Td>{labels.date}</Td>
                        <Td>{labels.slot}</Td>
                        <Td>{labels.category}</Td>
                        <Td>{row.menuName}</Td>
                        <Td right>
                          <span className="font-semibold tabular-nums">
                            {row.quantity}
                          </span>
                        </Td>
                        <Td right>
                          <span className="tabular-nums text-stone-500">
                            {formatAud(row.priceAud)}
                          </span>
                        </Td>
                        <Td right>
                          <span className="font-semibold tabular-nums text-rose-800">
                            {formatAud(row.amount)}
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

function Th({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: boolean;
}) {
  return (
    <th
      className={`whitespace-nowrap px-2 py-2 font-medium ${
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
      className={`whitespace-nowrap px-2 py-2 ${
        right ? "text-right" : "text-left"
      }`}
    >
      {children}
    </td>
  );
}

function Empty() {
  return (
    <p className="rounded-xl border border-stone-200 bg-white p-6 text-center text-stone-500">
      No data for this month yet.
    </p>
  );
}
