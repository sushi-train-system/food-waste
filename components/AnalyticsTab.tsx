"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchAnalytics } from "@/lib/api";
import { formatAud, monthRange, yearRange } from "@/lib/config";
import type { AnalyticsResponse } from "@/lib/types";

type RangePreset = "month" | "year" | "all";

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: "month", label: "今月" },
  { key: "year", label: "今年" },
  { key: "all", label: "全期間" },
];

function rangeFor(preset: RangePreset): { start?: string; end?: string } {
  if (preset === "month") return monthRange();
  if (preset === "year") return yearRange();
  return {};
}

export default function AnalyticsTab() {
  const [preset, setPreset] = useState<RangePreset>("month");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weekdayMode, setWeekdayMode] = useState<"avg" | "total">("avg");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchAnalytics(rangeFor(preset))
      .then(setData)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [preset]);

  return (
    <div className="pb-24">
      <div className="sticky top-14 z-10 bg-stone-100/95 backdrop-blur border-b border-stone-200 px-4 py-3 flex gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              preset === p.key
                ? "bg-rose-800 text-white"
                : "bg-white text-stone-600 border border-stone-300"
            }`}
          >
            {p.label}
          </button>
        ))}
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
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={data.weekday.map((w) => ({
                      label: w.label,
                      amount:
                        weekdayMode === "avg" ? w.avgAmount : w.amount,
                      qty: weekdayMode === "avg" ? w.avg : w.total,
                    }))}
                    margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
                  >
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      formatter={(v, _n, p) => [
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
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {data.weekday.map((w, i) => (
                        <Cell
                          key={i}
                          fill={
                            w.weekday === 0
                              ? "#e11d48"
                              : w.weekday === 6
                                ? "#2563eb"
                                : "#9f1239"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* 曜日別廃棄数（参考） */}
              <Card title="曜日別の廃棄数（個）">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart
                    data={data.weekday.map((w) => ({
                      label: w.label,
                      value: weekdayMode === "avg" ? w.avg : w.total,
                    }))}
                    margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                  >
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      formatter={(v) => `${v} 個`}
                      labelFormatter={(l) => `${l}曜日`}
                    />
                    <Bar dataKey="value" fill="#78716c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* 月次 */}
              <Card title="月次の廃棄額">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={data.monthly.map((m) => ({
                      label: m.period.slice(5),
                      amount: m.amount,
                      qty: m.total,
                    }))}
                    margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
                  >
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as {
                          amount: number;
                          qty: number;
                        };
                        return (
                          <div className="rounded-lg bg-white border border-stone-200 px-3 py-2 text-sm shadow">
                            <p className="font-medium">{label}月</p>
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
                    <Bar dataKey="amount" fill="#9f1239" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* ジャンル別 */}
              <Card title="ジャンル別の廃棄額">
                <div className="space-y-2">
                  {data.byCategory.map((c) => {
                    const pct =
                      data.totalAmount > 0
                        ? Math.round((c.amount / data.totalAmount) * 100)
                        : 0;
                    return (
                      <div key={c.name}>
                        <div className="flex justify-between text-sm mb-0.5">
                          <span className="font-medium">{c.name}</span>
                          <span className="tabular-nums text-stone-500">
                            {formatAud(c.amount)} ({c.total}個 / {pct}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
                          <div
                            className="h-full bg-rose-700 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
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
  const peak = [...data.weekday].sort((a, b) => b.avgAmount - a.avgAmount)[0];
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
