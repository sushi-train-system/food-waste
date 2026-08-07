import { prisma } from "@/lib/prisma";
import { todayStr, WEEKDAY_LABELS, weekdayIndexFromDate } from "@/lib/config";
import { getDefaultStore } from "@/lib/store";
import type {
  AnalyticsResponse,
  CategoryBreakdown,
  MonthlyPoint,
  SameMonthComparison,
  WeekdayPoint,
  YearlyPoint,
} from "@/lib/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const round2 = (n: number) => Math.round(n * 100) / 100;

function sameMonth(start: string | null, end: string | null) {
  if (!start || !end || !DATE_RE.test(start) || !DATE_RE.test(end)) return null;
  const month = start.slice(0, 7);
  return end.startsWith(month) ? month : null;
}

function previousYearMonth(month: string) {
  const year = Number(month.slice(0, 4)) - 1;
  return `${year}-${month.slice(5)}`;
}

function monthRange(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const lastDay = new Date(year, monthIndex, 0).getDate();
  return {
    start: `${month}-01`,
    end: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

function changePct(current: number, previous: number) {
  if (previous === 0) return null;
  return round2(((current - previous) / previous) * 100);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dateFromString(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function dateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function minDateString(a: string, b: string) {
  return a <= b ? a : b;
}

function weekdayDayCounts(start: string | null, end: string | null) {
  const counts = new Array(7).fill(0) as number[];
  if (!start || !end || !DATE_RE.test(start) || !DATE_RE.test(end)) {
    return counts;
  }

  const today = todayStr();
  const effectiveEnd = minDateString(end, today);
  if (effectiveEnd < start) return counts;

  for (
    let cursor = dateFromString(start);
    dateString(cursor) <= effectiveEnd;
    cursor = addDays(cursor, 1)
  ) {
    counts[weekdayIndexFromDate(dateString(cursor))]++;
  }
  return counts;
}

async function aggregateMonth(
  storeId: string,
  month: string,
  categorySlug: string | null,
): Promise<MonthlyPoint> {
  const range = monthRange(month);
  const rows = await prisma.wasteEntry.findMany({
    where: {
      storeId,
      date: { gte: range.start, lte: range.end },
      ...(categorySlug
        ? { menuItem: { category: { slug: categorySlug } } }
        : {}),
    },
    select: {
      quantity: true,
      menuItem: { select: { priceAud: true } },
    },
  });

  let total = 0;
  let amount = 0;
  for (const row of rows) {
    total += row.quantity;
    amount += row.quantity * row.menuItem.priceAud;
  }

  return { period: month, total, amount: round2(amount) };
}

// GET /api/analytics?start=YYYY-MM-DD&end=YYYY-MM-DD&category=slug
export async function GET(request: Request) {
  const store = await getDefaultStore();
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const categorySlug = searchParams.get("category");
  const selectedMonth = sameMonth(start, end);

  const dateFilter: { gte?: string; lte?: string } = {};
  if (start && DATE_RE.test(start)) dateFilter.gte = start;
  if (end && DATE_RE.test(end)) dateFilter.lte = end;

  const rows = await prisma.wasteEntry.findMany({
    where: {
      storeId: store.id,
      ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
      ...(categorySlug
        ? { menuItem: { category: { slug: categorySlug } } }
        : {}),
    },
    select: {
      date: true,
      quantity: true,
      menuItem: {
        select: {
          priceAud: true,
          category: { select: { name: true } },
        },
      },
    },
    orderBy: { date: "asc" },
  });

  const monthlyMap = new Map<string, { qty: number; amt: number }>();
  const yearlyMap = new Map<string, { qty: number; amt: number }>();
  const weekdayTotals = new Array(7).fill(0) as number[];
  const weekdayAmounts = new Array(7).fill(0) as number[];
  const categoryMap = new Map<string, { qty: number; amt: number }>();

  let totalCount = 0;
  let totalAmount = 0;
  let rangeStart: string | null = null;
  let rangeEnd: string | null = null;

  for (const r of rows) {
    const q = r.quantity;
    const amt = q * r.menuItem.priceAud;
    totalCount += q;
    totalAmount += amt;

    const month = r.date.slice(0, 7);
    const year = r.date.slice(0, 4);

    const m = monthlyMap.get(month) ?? { qty: 0, amt: 0 };
    m.qty += q;
    m.amt += amt;
    monthlyMap.set(month, m);

    const y = yearlyMap.get(year) ?? { qty: 0, amt: 0 };
    y.qty += q;
    y.amt += amt;
    yearlyMap.set(year, y);

    const wd = weekdayIndexFromDate(r.date);
    weekdayTotals[wd] += q;
    weekdayAmounts[wd] += amt;

    const catName = r.menuItem.category.name;
    const c = categoryMap.get(catName) ?? { qty: 0, amt: 0 };
    c.qty += q;
    c.amt += amt;
    categoryMap.set(catName, c);

    if (!rangeStart || r.date < rangeStart) rangeStart = r.date;
    if (!rangeEnd || r.date > rangeEnd) rangeEnd = r.date;
  }

  const monthly: MonthlyPoint[] = [...monthlyMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, v]) => ({
      period,
      total: v.qty,
      amount: round2(v.amt),
    }));

  const yearly: YearlyPoint[] = [...yearlyMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, v]) => ({
      period,
      total: v.qty,
      amount: round2(v.amt),
    }));

  const averageStart = dateFilter.gte ?? rangeStart;
  const averageEnd = dateFilter.lte ?? rangeEnd;
  const weekdayDays = weekdayDayCounts(averageStart, averageEnd);

  const order = [1, 2, 3, 4, 5, 6, 0];
  const weekday: WeekdayPoint[] = order.map((wd) => {
    const days = weekdayDays[wd];
    const total = weekdayTotals[wd];
    const amount = round2(weekdayAmounts[wd]);
    return {
      weekday: wd,
      label: WEEKDAY_LABELS[wd],
      total,
      amount,
      days,
      avg: days > 0 ? Math.round((total / days) * 10) / 10 : 0,
      avgAmount: days > 0 ? round2(amount / days) : 0,
    };
  });

  const byCategory: CategoryBreakdown[] = [...categoryMap.entries()]
    .sort((a, b) => b[1].amt - a[1].amt)
    .map(([name, v]) => ({
      name,
      total: v.qty,
      amount: round2(v.amt),
    }));

  let sameMonthComparison: SameMonthComparison | null = null;
  if (selectedMonth) {
    const previousMonth = previousYearMonth(selectedMonth);
    const current =
      monthly.find((m) => m.period === selectedMonth) ?? {
        period: selectedMonth,
        total: 0,
        amount: 0,
      };
    const previous = await aggregateMonth(store.id, previousMonth, categorySlug);
    sameMonthComparison = {
      current,
      previous,
      diffTotal: current.total - previous.total,
      diffAmount: round2(current.amount - previous.amount),
      totalChangePct: changePct(current.total, previous.total),
      amountChangePct: changePct(current.amount, previous.amount),
    };
  }

  const response: AnalyticsResponse = {
    monthly,
    yearly,
    weekday,
    byCategory,
    sameMonthComparison,
    totalCount,
    totalAmount: round2(totalAmount),
    rangeStart,
    rangeEnd,
  };

  return Response.json(response);
}
