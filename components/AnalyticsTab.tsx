"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchAnalytics } from "@/lib/api";
import { formatAud, todayStr, yearRange } from "@/lib/config";
import type { AnalyticsResponse } from "@/lib/types";

type RangePreset = "month" | "year" | "all";

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: "month", label: "月別" },
  { key: "year", label: "今年" },
  { key: "all", label: "全期間" },
];

const ABOVE_AVERAGE_FILL = "#9f1239";
const BELOW_AVERAGE_FILL = "#a8a29e";
const CATEGORY_COLORS = [
  "#9f1239",
  "#be123c",
  "#e11d48",
  "#f43f5e",
  "#fb7185",
  "#a8a29e",
  "#78716c",
];
const RADIAN = Math.PI / 180;

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function metricFill(value: number, averageValue: number) {
  return value > averageValue ? ABOVE_AVERAGE_FILL : BELOW_AVERAGE_FILL;
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

function rangeFor(
  preset: RangePreset,
  month: string,
): { start?: string; end?: string } {
  if (preset === "month") return monthRangeFromValue(month);
  if (preset === "year") return yearRange();
  return {};
}

export default function AnalyticsTab() {
  const [preset, setPreset] = useState<RangePreset>("month");
  const [month, setMonth] = useState(() => monthValue());
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weekdayMode, setWeekdayMode] = useState<"avg" | "total">("avg");

  useEffect(() => {
    fetchAnalytics(rangeFor(preset, month))
      .then(setData)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [preset, month]);

  return (
    <div className="pb-24">
      <div className="sticky top-14 z-10 space-y-2 border-b border-stone-200 bg-stone-100/95 px-4 py-3 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => {
                setLoading(true);
                setError("");
                setPreset(p.key);
              }}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                preset === p.key
                  ? "bg-rose-800 text-white"
                  : "bg-white text-stone-600 border border-stone-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === "month" && (
          <input
            type="month"
            value={month}
            onChange={(e) => {
              setLoading(true);
              setError("");
              setMonth(e.target.value || monthValue());
            }}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base"
          />
        )}
      </div>

      {loading && (
        <div className="p-6 text-center text-stone-500">集計中…</div>
      )}
      {error && <p className="px-4 pt-4 text-sm text-red-600">{error}</p>}

      {data && !loading && (
        <div className="px-4 py-4 space-y-5">
          <SummaryCard data={data} weekdayMode={weekdayMode} />

          {data.totalCount === 0 ? (
            <p className="rounded-xl bg-white border border-stone-200 p-6 text-center text-stone-500">
              この期間のデータはまだありません。
            </p>
          ) : (
            <>
              {/* 曜日別廃棄額 */}
              <Card
                title="曜日別の廃棄額"
                right={
                  <div className="flex gap-1 text-xs">
                    <ToggleBtn
                      active={weekdayMode === "avg"}
                      onClick={() => setWeekdayMode("avg")}
                    >
                      1日平均
                    </ToggleBtn>
                    <ToggleBtn
                      active={weekdayMode === "total"}
                      onClick={() => setWeekdayMode("total")}
                    >
                      合計
                    </ToggleBtn>
                  </div>
                }
              >
                {(() => {
                  const chartData = data.weekday.map((w) => ({
                    label: w.label,
                    amount: weekdayMode === "avg" ? w.avgAmount : w.amount,
                    qty: weekdayMode === "avg" ? w.avg : w.total,
                  }));
                  const mean = average(chartData.map((w) => w.amount));
                  return (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={chartData}
                        margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
                      >
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => `$${v}`}
                        />
                        <Tooltip
                          formatter={(v) => [
                            formatAud(Number(v)),
                            weekdayMode === "avg" ? "1日平均" : "合計",
                          ]}
                          labelFormatter={(l) => `${l}曜日`}
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload as {
                              amount: number;
                              qty: number;
                            };
                            return (
                              <div className="rounded-lg bg-white border border-stone-200 px-3 py-2 text-sm shadow">
                                <p className="font-medium">{label}曜日</p>
                                <p className="text-rose-800 font-bold">
                                  {formatAud(d.amount)}
                                </p>
                                <p className="text-stone-500 text-xs">
                                  {d.qty} 個
                                </p>
                              </div>
                            );
                          }}
                        />
                        <Bar
                          dataKey="amount"
                          radius={[4, 4, 0, 0]}
                        >
                          {chartData.map((w, i) => (
                            <Cell key={i} fill={metricFill(w.amount, mean)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </Card>

              {/* 曜日別廃棄数（参考） */}
              <Card title="曜日別の廃棄数（個）">
                {(() => {
                  const chartData = data.weekday.map((w) => ({
                    label: w.label,
                    value: weekdayMode === "avg" ? w.avg : w.total,
                  }));
                  const mean = average(chartData.map((w) => w.value));
                  return (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart
                        data={chartData}
                        margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                      >
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip
                          formatter={(v) => `${v} 個`}
                          labelFormatter={(l) => `${l}曜日`}
                        />
                        <Bar
                          dataKey="value"
                          radius={[4, 4, 0, 0]}
                        >
                          {chartData.map((w, i) => (
                            <Cell key={i} fill={metricFill(w.value, mean)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </Card>

              {preset === "month" && data.sameMonthComparison && (
                <SameMonthComparisonCard data={data.sameMonthComparison} />
              )}

              {/* ジャンル別 */}
              <Card title="ジャンル別の廃棄額">
                <CategoryPieChart data={data} />
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  data,
  weekdayMode,
}: {
  data: AnalyticsResponse;
  weekdayMode: "avg" | "total";
}) {
  const peak = [...data.weekday].sort((a, b) =>
    weekdayMode === "avg"
      ? b.avgAmount - a.avgAmount
      : b.amount - a.amount,
  )[0];
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl bg-rose-800 text-white p-4">
        <p className="text-xs opacity-80">合計廃棄額</p>
        <p className="text-2xl font-bold tabular-nums">
          {formatAud(data.totalAmount)}
        </p>
        <p className="text-xs opacity-80 mt-1">{data.totalCount} 個</p>
      </div>
      <div className="rounded-xl bg-white border border-stone-200 p-4">
        <p className="text-xs text-stone-500">最も多い曜日</p>
        <p className="text-2xl font-bold tabular-nums text-rose-800">
          {peak && peak.amount > 0 ? `${peak.label}曜` : "—"}
        </p>
        <p className="text-xs text-stone-500 mt-1">
          {peak && peak.amount > 0
            ? weekdayMode === "avg"
              ? `平均 ${formatAud(peak.avgAmount)}/日`
              : `合計 ${formatAud(peak.amount)}`
            : "データなし"}
        </p>
      </div>
    </div>
  );
}

function SameMonthComparisonCard({
  data,
}: {
  data: NonNullable<AnalyticsResponse["sameMonthComparison"]>;
}) {
  const amountUp = data.diffAmount > 0;
  const amountFlat = data.diffAmount === 0;
  const totalUp = data.diffTotal > 0;
  const totalFlat = data.diffTotal === 0;
  return (
    <Card title="昨年同月比較">
      <div className="grid grid-cols-2 gap-3">
        <ComparisonMetric
          label="廃棄額"
          current={formatAud(data.current.amount)}
          previous={`${data.previous.period}: ${formatAud(data.previous.amount)}`}
          diff={`${amountUp ? "+" : ""}${formatAud(data.diffAmount)}`}
          pct={data.amountChangePct}
          up={amountUp}
          flat={amountFlat}
        />
        <ComparisonMetric
          label="廃棄数"
          current={`${data.current.total} 個`}
          previous={`${data.previous.period}: ${data.previous.total} 個`}
          diff={`${totalUp ? "+" : ""}${data.diffTotal} 個`}
          pct={data.totalChangePct}
          up={totalUp}
          flat={totalFlat}
        />
      </div>
    </Card>
  );
}

function CategoryPieChart({ data }: { data: AnalyticsResponse }) {
  const chartData = [...data.byCategory]
    .sort((a, b) => b.amount - a.amount)
    .map((category, index) => ({
      ...category,
      pct:
        data.totalAmount > 0
          ? Math.round((category.amount / data.totalAmount) * 100)
          : 0,
      fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="amount"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={112}
            paddingAngle={2}
            startAngle={90}
            endAngle={-270}
            activeShape={false}
            label={renderCategoryLabel}
            labelLine={{ stroke: "#a8a29e", strokeWidth: 1 }}
          >
            {chartData.map((category) => (
              <Cell key={category.name} fill={category.fill} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as (typeof chartData)[number];
              return (
                <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm shadow">
                  <p className="font-medium">{d.name}</p>
                  <p className="font-bold text-rose-800">
                    {formatAud(d.amount)}
                  </p>
                  <p className="text-xs text-stone-500">
                    {d.total}個 / {d.pct}%
                  </p>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2">
        {chartData.map((category) => (
          <div
            key={category.name}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: category.fill }}
              />
              <span className="truncate font-medium">{category.name}</span>
            </div>
            <span className="shrink-0 tabular-nums text-stone-500">
              {formatAud(category.amount)} ({category.total}個 / {category.pct}
              %)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderCategoryLabel({
  cx,
  cy,
  midAngle,
  outerRadius,
  payload,
}: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  payload?: { name?: string; pct?: number };
}) {
  const name = payload?.name ?? "";
  const pct = payload?.pct ?? 0;
  if (
    typeof cx !== "number" ||
    typeof cy !== "number" ||
    typeof midAngle !== "number" ||
    typeof outerRadius !== "number"
  ) {
    return null;
  }
  if (pct <= 0) return null;
  const radius = outerRadius + 22;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const anchor = x > cx ? "start" : "end";
  const label = name.length > 12 ? `${name.slice(0, 11)}...` : name;

  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      dominantBaseline="central"
      className="fill-stone-600 text-[11px] font-medium"
    >
      {label} {pct}%
    </text>
  );
}

function ComparisonMetric({
  label,
  current,
  previous,
  diff,
  pct,
  up,
  flat,
}: {
  label: string;
  current: string;
  previous: string;
  diff: string;
  pct: number | null;
  up: boolean;
  flat: boolean;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-stone-900">
        {current}
      </p>
      <p className="mt-1 text-xs tabular-nums text-stone-500">{previous}</p>
      <p
        className={`mt-2 text-sm font-bold tabular-nums ${
          flat ? "text-stone-500" : up ? "text-rose-700" : "text-emerald-700"
        }`}
      >
        {diff}
        {pct !== null && (
          <span className="ml-1 text-xs font-medium">({pct > 0 ? "+" : ""}{pct}%)</span>
        )}
        {pct === null && <span className="ml-1 text-xs font-medium">前年なし</span>}
      </p>
    </div>
  );
}

function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white border border-stone-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-stone-800">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

function ToggleBtn({
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
      className={`rounded-full px-2.5 py-1 font-medium ${
        active ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-500"
      }`}
    >
      {children}
    </button>
  );
}
