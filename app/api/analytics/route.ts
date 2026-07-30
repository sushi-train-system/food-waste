import { prisma } from "@/lib/prisma";
import { WEEKDAY_LABELS, weekdayIndexFromDate } from "@/lib/config";
import { getDefaultStore } from "@/lib/store";
import type {
  AnalyticsResponse,
  CategoryBreakdown,
  MonthlyPoint,
  WeekdayPoint,
  YearlyPoint,
} from "@/lib/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const round2 = (n: number) => Math.round(n * 100) / 100;

// GET /api/analytics?start=YYYY-MM-DD&end=YYYY-MM-DD&category=slug
export async function GET(request: Request) {
  const store = await getDefaultStore();
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const categorySlug = searchParams.get("category");

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
  const weekdayDays: Array<Set<string>> = Array.from(
    { length: 7 },
    () => new Set<string>(),
  );
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
    weekdayDays[wd].add(r.date);

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

  const order = [1, 2, 3, 4, 5, 6, 0];
  const weekday: WeekdayPoint[] = order.map((wd) => {
    const days = weekdayDays[wd].size;
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

  const response: AnalyticsResponse = {
    monthly,
    yearly,
    weekday,
    byCategory,
    totalCount,
    totalAmount: round2(totalAmount),
    rangeStart,
    rangeEnd,
  };

  return Response.json(response);
}
