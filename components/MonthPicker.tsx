"use client";

import { formatMonthLabel } from "@/lib/config";

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

function parseMonth(value: string) {
  const [year, month] = value.split("-");
  return {
    year: Number(year),
    month: Number(month),
  };
}

function monthValue(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export default function MonthPicker({
  label,
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const parsed = parseMonth(value);
  const year = Number.isFinite(parsed.year) ? parsed.year : new Date().getFullYear();
  const month =
    Number.isFinite(parsed.month) && parsed.month >= 1 && parsed.month <= 12
      ? parsed.month
      : new Date().getMonth() + 1;

  return (
    <label className="block min-w-0 space-y-1">
      {label && (
        <span className="flex items-center justify-between gap-2 text-xs font-medium text-stone-500">
          <span>{label}</span>
          <span className="tabular-nums text-stone-700">
            {formatMonthLabel(value)}
          </span>
        </span>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)_5.75rem] gap-2">
        <select
          value={month}
          onChange={(e) => onChange(monthValue(year, Number(e.target.value)))}
          className="min-w-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-base font-medium tabular-nums"
        >
          {MONTHS.map((name, index) => (
            <option key={name} value={index + 1}>
              {name}
            </option>
          ))}
        </select>
        <input
          type="number"
          inputMode="numeric"
          min={2000}
          max={2100}
          value={year}
          onChange={(e) => {
            const nextYear = Number(e.target.value);
            if (!Number.isFinite(nextYear)) return;
            onChange(monthValue(nextYear, month));
          }}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-base font-medium tabular-nums"
          aria-label={label ? `${label} year` : "Year"}
        />
      </div>
    </label>
  );
}
