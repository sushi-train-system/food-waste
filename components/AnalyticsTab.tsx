"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchAnalytics } from "@/lib/api";
import { formatAud, formatMonthLabel, todayStr, yearRange } from "@/lib/config";
import MonthPicker from "./MonthPicker";
import type {
  AnalyticsItemBreakdown,
  AnalyticsResponse,
  TimeSlotPoint,
  WeekdayPoint,
} from "@/lib/types";

type RangePreset = "month" | "year" | "all";
type ProductMetric = "amount" | "count";
type ComparisonSource = "current" | "comparison";

type ProductBreakdownSelection = {
  source: ComparisonSource;
  weekday: number;
  label: string;
  metric: ProductMetric;
};

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: "month", label: "Monthly" },
  { key: "year", label: "This Year" },
  { key: "all", label: "All Time" },
];

const CURRENT_FILL = "#9f1239";
const COMPARE_FILL = "#78716c";
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
const PRODUCT_CHART_SLICE_LIMIT = 7;
const PRODUCT_CHART_LABEL_MIN_PCT = 8;

function monthValue(date = todayStr()) {
  return date.slice(0, 7);
}

function previousMonthValue(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(year, monthIndex - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
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

function weekdayItems(data: AnalyticsResponse | null, weekday: number) {
  return data?.itemsByWeekday.find((w) => w.weekday === weekday)?.items ?? [];
}

function weekdayTimeSlots(data: AnalyticsResponse | null, weekday: number) {
  return data?.timeSlotsByWeekday.find((w) => w.weekday === weekday)?.slots ?? [];
}

function monthlyItems(data: AnalyticsResponse | null) {
  const itemMap = new Map<string, AnalyticsItemBreakdown>();
  for (const weekday of data?.itemsByWeekday ?? []) {
    for (const item of weekday.items) {
      const key = `${item.categoryName}:${item.menuName}`;
      const current = itemMap.get(key) ?? {
        menuName: item.menuName,
        categoryName: item.categoryName,
        quantity: 0,
        amount: 0,
      };
      current.quantity += item.quantity;
      current.amount = Math.round((current.amount + item.amount) * 100) / 100;
      itemMap.set(key, current);
    }
  }
  return [...itemMap.values()];
}

export default function AnalyticsTab() {
  const [preset, setPreset] = useState<RangePreset>("month");
  const [month, setMonth] = useState(() => monthValue());
  const [compareMonth, setCompareMonth] = useState(() =>
    previousMonthValue(monthValue()),
  );
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [comparisonData, setComparisonData] =
    useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weekdayMetric, setWeekdayMetric] = useState<ProductMetric>("amount");
  const [productSelection, setProductSelection] =
    useState<ProductBreakdownSelection | null>(null);

  useEffect(() => {
    const currentRange = rangeFor(preset, month);
    const comparisonRange =
      preset === "month" ? monthRangeFromValue(compareMonth) : null;

    Promise.all([
      fetchAnalytics(currentRange),
      comparisonRange ? fetchAnalytics(comparisonRange) : Promise.resolve(null),
    ])
      .then(([current, comparison]) => {
        setData(current);
        setComparisonData(comparison);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [preset, month, compareMonth]);

  const selectedCurrentItems = useMemo(() => {
    if (!productSelection) return monthlyItems(data);
    return weekdayItems(data, productSelection.weekday);
  }, [data, productSelection]);
  const selectedComparisonItems = useMemo(() => {
    if (!productSelection) return monthlyItems(comparisonData);
    return weekdayItems(comparisonData, productSelection.weekday);
  }, [comparisonData, productSelection]);
  const currentPeriodLabel =
    preset === "month" ? formatMonthLabel(month) : "Selected Period";
  const productMetric = productSelection?.metric ?? weekdayMetric;
  const productBreakdownTitle = productSelection
    ? `${productSelection.label} Product Breakdown`
    : "Monthly Product Breakdown";
  const selectedCurrentTimeSlots = productSelection
    ? weekdayTimeSlots(data, productSelection.weekday)
    : data?.timeSlots ?? [];
  const selectedComparisonTimeSlots = productSelection
    ? weekdayTimeSlots(comparisonData, productSelection.weekday)
    : comparisonData?.timeSlots ?? [];
  const timeSlotTitle = productSelection
    ? `${productSelection.label} Waste by Time Slot`
    : "Monthly Waste by Time Slot";

  const selectWeekdayProducts = (selection: {
    source: ComparisonSource;
    weekday: number;
    label: string;
    metric: ProductMetric;
  }) => {
    setProductSelection((current) =>
      current &&
      current.source === selection.source &&
      current.weekday === selection.weekday &&
      current.metric === selection.metric
        ? null
        : selection,
    );
  };

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
                setProductSelection(null);
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
          <div className="grid grid-cols-2 gap-2">
            <MonthPicker
              label="Display Month"
              value={month}
              onChange={(value) => {
                  setLoading(true);
                  setError("");
                  setProductSelection(null);
                  setMonth(value || monthValue());
              }}
            />
            <MonthPicker
              label="Compare Month"
              value={compareMonth}
              onChange={(value) => {
                  setLoading(true);
                  setError("");
                  setProductSelection(null);
                  setCompareMonth(value || previousMonthValue(month));
              }}
            />
          </div>
        )}
      </div>

      {loading && (
        <div className="p-6 text-center text-stone-500">Calculating...</div>
      )}
      {error && <p className="px-4 pt-4 text-sm text-red-600">{error}</p>}

      {data && !loading && (
        <div className="px-4 py-4 space-y-5">
          <SummaryCard data={data} />

          {data.totalCount === 0 && !comparisonData?.totalCount ? (
            <p className="rounded-xl bg-white border border-stone-200 p-6 text-center text-stone-500">
              No data for this period yet.
            </p>
          ) : (
            <>
              <Card
                title="Waste by Weekday"
                right={
                  <div className="flex gap-1 text-xs">
                    <ToggleBtn
                      active={weekdayMetric === "amount"}
                      onClick={() => {
                        setProductSelection(null);
                        setWeekdayMetric("amount");
                      }}
                    >
                      Waste Amount
                    </ToggleBtn>
                    <ToggleBtn
                      active={weekdayMetric === "count"}
                      onClick={() => {
                        setProductSelection(null);
                        setWeekdayMetric("count");
                      }}
                    >
                      Waste Qty
                    </ToggleBtn>
                  </div>
                }
              >
                <WeekdayComparisonChart
                  current={data.weekday}
                  comparison={comparisonData?.weekday ?? null}
                  currentLabel={
                    preset === "month" ? formatMonthLabel(month) : "Selected Period"
                  }
                  comparisonLabel={formatMonthLabel(compareMonth)}
                  metric={weekdayMetric}
                  selected={productSelection}
                  onSelect={selectWeekdayProducts}
                />
              </Card>

              <Card
                title={productBreakdownTitle}
                right={
                  <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
                    {productMetric === "amount" ? "Waste Amount" : "Waste Qty"}
                  </span>
                }
              >
                <div className="grid grid-cols-2 gap-3">
                  <ProductPieChart
                    key={`current-${productSelection?.weekday ?? "month"}-${productMetric}-${currentPeriodLabel}`}
                    title={
                      productSelection
                        ? `${currentPeriodLabel} / ${productSelection.label}`
                        : currentPeriodLabel
                    }
                    accentColor={CURRENT_FILL}
                    items={selectedCurrentItems}
                    metric={productMetric}
                  />
                  {comparisonData && (
                    <ProductPieChart
                      key={`comparison-${productSelection?.weekday ?? "month"}-${productMetric}-${compareMonth}`}
                      title={
                        productSelection
                          ? `${formatMonthLabel(compareMonth)} / ${productSelection.label}`
                          : formatMonthLabel(compareMonth)
                      }
                      accentColor={COMPARE_FILL}
                      items={selectedComparisonItems}
                      metric={productMetric}
                    />
                  )}
                </div>
              </Card>

              <Card
                title={timeSlotTitle}
                right={
                  <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
                    {weekdayMetric === "amount" ? "Waste Amount" : "Waste Qty"}
                  </span>
                }
              >
                <TimeSlotComparisonChart
                  current={selectedCurrentTimeSlots}
                  comparison={comparisonData ? selectedComparisonTimeSlots : null}
                  currentLabel={
                    productSelection
                      ? `${currentPeriodLabel} / ${productSelection.label}`
                      : currentPeriodLabel
                  }
                  comparisonLabel={
                    productSelection
                      ? `${formatMonthLabel(compareMonth)} / ${productSelection.label}`
                      : formatMonthLabel(compareMonth)
                  }
                  metric={weekdayMetric}
                />
              </Card>

              {preset === "month" && data.sameMonthComparison && (
                <SameMonthComparisonCard data={data.sameMonthComparison} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function WeekdayComparisonChart({
  current,
  comparison,
  currentLabel,
  comparisonLabel,
  metric,
  selected,
  onSelect,
}: {
  current: WeekdayPoint[];
  comparison: WeekdayPoint[] | null;
  currentLabel: string;
  comparisonLabel: string;
  metric: ProductMetric;
  selected: ProductBreakdownSelection | null;
  onSelect: (selection: {
    source: ComparisonSource;
    weekday: number;
    label: string;
    metric: ProductMetric;
  }) => void;
}) {
  const comparisonByWeekday = new Map(
    (comparison ?? []).map((w) => [w.weekday, w]),
  );
  const chartData = current.map((w) => {
    const c = comparisonByWeekday.get(w.weekday);
    return {
      weekday: w.weekday,
      label: w.label,
      current: metric === "amount" ? w.avgAmount : w.avg,
      comparison: c
        ? metric === "amount"
          ? c.avgAmount
          : c.avg
        : 0,
    };
  });
  const hasComparison = comparison !== null;
  const height = metric === "amount" ? 230 : 190;
  const activeDataKey =
    selected?.metric === metric
      ? selected.source === "current"
        ? "current"
        : "comparison"
      : null;

  const handleBarClick = (source: ComparisonSource, entry: unknown) => {
    const point = entry as {
      weekday?: number;
      label?: string;
      payload?: { weekday?: number; label?: string };
    };
    const weekday = point.weekday ?? point.payload?.weekday;
    const label = point.label ?? point.payload?.label;
    if (typeof weekday !== "number" || !label) return;
    onSelect({
      source,
      weekday,
      label,
      metric,
    });
  };

  const isSelected = (source: ComparisonSource, weekday: number) =>
    selected?.metric === metric &&
    selected.source === source &&
    selected.weekday === weekday;

  return (
    <div
      className={`space-y-3 rounded-lg p-2 transition-colors ${
        selected?.metric === metric ? "bg-rose-50/60" : "bg-transparent"
      }`}
    >
      {hasComparison && (
        <div className="flex flex-wrap gap-3 text-xs text-stone-600">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: CURRENT_FILL }}
            />
            {currentLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: COMPARE_FILL }}
            />
            {comparisonLabel}
          </span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{
            top: 8,
            right: 8,
            left: metric === "amount" ? -10 : -20,
            bottom: 0,
          }}
        >
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            allowDecimals={metric === "amount"}
            tickFormatter={(v) => (metric === "amount" ? `$${v}` : `${v}`)}
          />
          <Tooltip
            formatter={(v, name) => [
              metric === "amount" ? formatAud(Number(v)) : `${v} pcs`,
              name === "current" ? currentLabel : comparisonLabel,
            ]}
            labelFormatter={(l) => `${l} average per day`}
          />
          <Bar
            dataKey="current"
            fill={CURRENT_FILL}
            radius={[4, 4, 0, 0]}
            opacity={activeDataKey && activeDataKey !== "current" ? 0.55 : 1}
            onClick={(entry: unknown) => handleBarClick("current", entry)}
          >
            {chartData.map((entry) => (
              <Cell
                key={`current-${entry.weekday}`}
                fill={isSelected("current", entry.weekday) ? "#be123c" : CURRENT_FILL}
              />
            ))}
          </Bar>
          {hasComparison && (
            <Bar
              dataKey="comparison"
              fill={COMPARE_FILL}
              radius={[4, 4, 0, 0]}
              opacity={
                activeDataKey && activeDataKey !== "comparison" ? 0.55 : 1
              }
              onClick={(entry: unknown) =>
                handleBarClick("comparison", entry)
              }
            >
              {chartData.map((entry) => (
                <Cell
                  key={`comparison-${entry.weekday}`}
                  fill={
                    isSelected("comparison", entry.weekday)
                      ? "#57534e"
                      : COMPARE_FILL
                  }
                />
              ))}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TimeSlotComparisonChart({
  current,
  comparison,
  currentLabel,
  comparisonLabel,
  metric,
}: {
  current: TimeSlotPoint[];
  comparison: TimeSlotPoint[] | null;
  currentLabel: string;
  comparisonLabel: string;
  metric: ProductMetric;
}) {
  const comparisonBySlot = new Map((comparison ?? []).map((s) => [s.slot, s]));
  const slotOrder = [
    ...new Set([
      ...current.map((s) => s.slot),
      ...(comparison ?? []).map((s) => s.slot),
    ]),
  ].sort((a, b) => a - b);
  const chartData = slotOrder.map((slot) => {
    const currentSlot = current.find((s) => s.slot === slot);
    const comparisonSlot = comparisonBySlot.get(slot);
    return {
      slot,
      label: currentSlot?.label ?? comparisonSlot?.label ?? `${slot}:00`,
      current: currentSlot
        ? metric === "amount"
          ? currentSlot.amount
          : currentSlot.total
        : 0,
      comparison: comparisonSlot
        ? metric === "amount"
          ? comparisonSlot.amount
          : comparisonSlot.total
        : 0,
    };
  });
  const totalCurrent = chartData.reduce((sum, row) => sum + row.current, 0);
  const average =
    chartData.length > 0
      ? Math.round((totalCurrent / chartData.length) * 100) / 100
      : 0;
  const hasComparison = comparison !== null;
  const height = Math.max(150, chartData.length * (hasComparison ? 34 : 28) + 46);

  if (chartData.length === 0) {
    return (
      <p className="rounded-lg bg-stone-50 p-5 text-center text-sm text-stone-500">
        No data
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {hasComparison && (
        <div className="flex flex-wrap gap-3 text-xs text-stone-600">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: CURRENT_FILL }}
            />
            {currentLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: COMPARE_FILL }}
            />
            {comparisonLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 text-stone-400">
            Average
          </span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 24, left: 0, bottom: 4 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => (metric === "amount" ? `$${v}` : `${v}`)}
          />
          <YAxis
            dataKey="label"
            type="category"
            width={48}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(v, name) => [
              metric === "amount" ? formatAud(Number(v)) : `${v} pcs`,
              name === "current" ? currentLabel : comparisonLabel,
            ]}
            labelFormatter={(label) => `${label}`}
          />
          <ReferenceLine
            x={average}
            stroke="#a8a29e"
            strokeDasharray="3 3"
            label={{
              value: "Avg",
              position: "insideTopRight",
              fill: "#78716c",
              fontSize: 11,
            }}
          />
          <Bar dataKey="current" fill={CURRENT_FILL} radius={[0, 4, 4, 0]} />
          {hasComparison && (
            <Bar
              dataKey="comparison"
              fill={COMPARE_FILL}
              radius={[0, 4, 4, 0]}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SummaryCard({ data }: { data: AnalyticsResponse }) {
  const peak = [...data.weekday].sort(
    (a, b) => b.avgAmount - a.avgAmount,
  )[0];
  return (
    <div className="grid h-full grid-cols-2 gap-3">
      <div className="rounded-xl bg-rose-800 text-white p-4">
        <p className="text-xs opacity-80">Total Waste Amount</p>
        <p className="text-2xl font-bold tabular-nums">
          {formatAud(data.totalAmount)}
        </p>
        <p className="text-xs opacity-80 mt-1">{data.totalCount} pcs</p>
      </div>
      <div className="rounded-xl bg-white border border-stone-200 p-4">
        <p className="text-xs text-stone-500">Highest Weekday</p>
        <p className="text-2xl font-bold tabular-nums text-rose-800">
          {peak && peak.amount > 0 ? peak.label : "—"}
        </p>
        <p className="text-xs text-stone-500 mt-1">
          {peak && peak.amount > 0
            ? `Avg ${formatAud(peak.avgAmount)}/day`
            : "No data"}
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
    <Card title="Same Month Last Year">
      <div className="grid gap-2 lg:grid-cols-2">
        <ComparisonMetric
          label="Waste Amount"
          current={formatAud(data.current.amount)}
          previous={`${formatMonthLabel(data.previous.period)}: ${formatAud(data.previous.amount)}`}
          diff={`${amountUp ? "+" : ""}${formatAud(data.diffAmount)}`}
          pct={data.amountChangePct}
          up={amountUp}
          flat={amountFlat}
        />
        <ComparisonMetric
          label="Waste Qty"
          current={`${data.current.total} pcs`}
          previous={`${formatMonthLabel(data.previous.period)}: ${data.previous.total} pcs`}
          diff={`${totalUp ? "+" : ""}${data.diffTotal} pcs`}
          pct={data.totalChangePct}
          up={totalUp}
          flat={totalFlat}
        />
      </div>
    </Card>
  );
}

function ProductPieChart({
  title,
  accentColor,
  items,
  metric,
}: {
  title: string;
  accentColor: string;
  items: AnalyticsItemBreakdown[];
  metric: ProductMetric;
}) {
  const [expanded, setExpanded] = useState(false);
  const sortedItems = [...items].sort((a, b) =>
    metric === "amount"
      ? b.amount - a.amount
      : b.quantity - a.quantity,
  );
  const total = sortedItems.reduce(
    (sum, item) => sum + (metric === "amount" ? item.amount : item.quantity),
    0,
  );
  const chartData = sortedItems.map((item, index) => {
    const value = metric === "amount" ? item.amount : item.quantity;
    return {
      ...item,
      name: item.menuName,
      value,
      pct: total > 0 ? Math.round((value / total) * 100) : 0,
      fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    };
  });
  const primaryChartItems = chartData.slice(0, PRODUCT_CHART_SLICE_LIMIT);
  const otherChartItems = chartData.slice(PRODUCT_CHART_SLICE_LIMIT);
  const otherValue = otherChartItems.reduce((sum, item) => sum + item.value, 0);
  const otherAmount = otherChartItems.reduce((sum, item) => sum + item.amount, 0);
  const otherQuantity = otherChartItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const groupedChartData =
    otherValue > 0
      ? [
          ...primaryChartItems,
          {
            menuName: "Other",
            categoryName: `${otherChartItems.length} items`,
            name: "Other",
            value: otherValue,
            amount: otherAmount,
            quantity: otherQuantity,
            pct: total > 0 ? Math.round((otherValue / total) * 100) : 0,
            fill: "#d6d3d1",
          },
        ]
      : primaryChartItems;
  const visibleItems = expanded ? chartData : chartData.slice(0, 3);
  const hiddenCount = Math.max(0, chartData.length - visibleItems.length);

  if (total === 0) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-3">
        <ProductBreakdownHeader
          title={title}
          accentColor={accentColor}
          metric={metric}
          total={0}
        />
        <p className="rounded-lg bg-stone-50 p-5 text-center text-sm text-stone-500">
          No data
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-stone-200 bg-white p-3">
      <ProductBreakdownHeader
        title={title}
        accentColor={accentColor}
        metric={metric}
        total={total}
      />
      <ResponsiveContainer width="100%" height={240}>
        <PieChart margin={{ top: 8, right: 34, bottom: 8, left: 34 }}>
          <Pie
            data={groupedChartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={42}
            outerRadius={82}
            paddingAngle={2}
            startAngle={90}
            endAngle={-270}
            activeShape={false}
            label={renderCategoryLabel}
            labelLine={false}
          >
            {groupedChartData.map((item) => (
              <Cell key={item.menuName} fill={item.fill} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as (typeof groupedChartData)[number];
              return (
                <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm shadow">
                  <p className="font-medium">{d.menuName}</p>
                  <p className="text-xs text-stone-500">{d.categoryName}</p>
                  <p className="mt-1 font-bold text-rose-800">
                    {metric === "amount"
                      ? formatAud(d.amount)
                      : `${d.quantity} pcs`}
                  </p>
                  <p className="text-xs text-stone-500">
                    {formatAud(d.amount)} / {d.quantity} pcs / {d.pct}%
                  </p>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2">
        {visibleItems.map((item) => (
          <div
            key={item.menuName}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-stone-50 px-3 py-2 text-sm"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: item.fill }}
              />
              <span className="truncate font-medium">{item.menuName}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-right text-xs tabular-nums text-stone-700">
              <span>
                {item.categoryName}
              </span>
              <span>
                {item.pct}% / {formatAud(item.amount)} / {item.quantity} pcs
              </span>
            </div>
          </div>
        ))}
        {chartData.length > 3 && (
          <button
            onClick={() => setExpanded((value) => !value)}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 active:bg-stone-100"
          >
            {expanded ? "Show top 3 only" : `Show all (${hiddenCount} more)`}
          </button>
        )}
      </div>
    </div>
  );
}

function ProductBreakdownHeader({
  title,
  accentColor,
  metric,
  total,
}: {
  title: string;
  accentColor: string;
  metric: ProductMetric;
  total: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: accentColor }}
        />
        <span className="truncate font-bold text-stone-800">{title}</span>
      </div>
      <span className="shrink-0 tabular-nums font-bold text-stone-900">
        {metric === "amount" ? formatAud(total) : `${total} pcs`}
      </span>
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
  if (pct < PRODUCT_CHART_LABEL_MIN_PCT) return null;
  const radius = outerRadius + 22;
  const lineStartRadius = outerRadius + 4;
  const lineEndRadius = outerRadius + 18;
  const lineStartX = cx + lineStartRadius * Math.cos(-midAngle * RADIAN);
  const lineStartY = cy + lineStartRadius * Math.sin(-midAngle * RADIAN);
  const lineEndX = cx + lineEndRadius * Math.cos(-midAngle * RADIAN);
  const lineEndY = cy + lineEndRadius * Math.sin(-midAngle * RADIAN);
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const anchor = x > cx ? "start" : "end";
  const label = name.length > 12 ? `${name.slice(0, 11)}...` : name;

  return (
    <g>
      <path
        d={`M${lineStartX},${lineStartY}L${lineEndX},${lineEndY}`}
        stroke="#a8a29e"
        strokeWidth={1}
        fill="none"
      />
      <text
        x={x}
        y={y}
        textAnchor={anchor}
        dominantBaseline="central"
        className="fill-stone-600 text-[11px] font-medium"
      >
        {label} {pct}%
      </text>
    </g>
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
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
      <p className="min-w-[110px] text-sm font-semibold text-stone-700">
        {label}
      </p>
      <p className="text-base font-bold tabular-nums text-stone-900">
        {current}
      </p>
      <p className="min-w-[160px] text-xs tabular-nums text-stone-500">
        {previous}
      </p>
      <div className="flex items-center gap-2">
        <span
          className={`text-sm font-bold tabular-nums ${
            flat ? "text-stone-500" : up ? "text-rose-700" : "text-emerald-700"
          }`}
        >
          {diff}
        </span>
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold tabular-nums ${
            flat
              ? "bg-stone-200 text-stone-600"
              : up
                ? "bg-red-100 text-red-700"
                : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {pct !== null ? `${pct > 0 ? "+" : ""}${pct}%` : "No previous"}
        </span>
      </div>
    </div>
  );
}

function Card({
  title,
  right,
  children,
  className = "",
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl bg-white border border-stone-200 p-4 ${className}`}>
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
