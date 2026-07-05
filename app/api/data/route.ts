import { prisma } from "@/lib/prisma";
import { weekdayIndexFromDate } from "@/lib/config";
import type {
  CategoryBreakdownDaily,
  DailyRow,
  ItemBreakdown,
  RawRow,
} from "@/lib/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const round2 = (n: number) => Math.round(n * 100) / 100;

// GET /api/data?view=raw|daily&start=YYYY-MM-DD&end=YYYY-MM-DD
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") === "daily" ? "daily" : "raw";
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const dateFilter: { gte?: string; lte?: string } = {};
  if (start && DATE_RE.test(start)) dateFilter.gte = start;
  if (end && DATE_RE.test(end)) dateFilter.lte = end;

  const rows = await prisma.wasteEntry.findMany({
    where: Object.keys(dateFilter).length ? { date: dateFilter } : {},
    select: {
      date: true,
      slot: true,
      quantity: true,
      menuItem: {
        select: {
          name: true,
          priceAud: true,
          category: { select: { name: true } },
        },
      },
    },
    orderBy: [{ date: "desc" }, { slot: "desc" }],
  });

  if (view === "raw") {
    const raw: RawRow[] = rows.map((r) => ({
      date: r.date,
      slot: r.slot,
      categoryName: r.menuItem.category.name,
      menuName: r.menuItem.name,
      quantity: r.quantity,
      priceAud: r.menuItem.priceAud,
      amount: round2(r.quantity * r.menuItem.priceAud),
    }));
    return Response.json({ view: "raw", rows: raw });
  }

  const dailyMap = new Map<string, DailyRow>();

  for (const r of rows) {
    const q = r.quantity;
    const amt = q * r.menuItem.priceAud;
    const catName = r.menuItem.category.name;
    const menuName = r.menuItem.name;

    let row = dailyMap.get(r.date);
    if (!row) {
      row = {
        date: r.date,
        weekday: weekdayIndexFromDate(r.date),
        total: 0,
        totalAmount: 0,
        byCategory: {},
      };
      dailyMap.set(r.date, row);
    }
    row.total += q;
    row.totalAmount += amt;

    if (!row.byCategory[catName]) {
      row.byCategory[catName] = { quantity: 0, amount: 0, items: [] };
    }
    const cat = row.byCategory[catName];
    cat.quantity += q;
    cat.amount += amt;

    let item = cat.items.find((i) => i.menuName === menuName);
    if (!item) {
      item = { menuName, quantity: 0, amount: 0 };
      cat.items.push(item);
    }
    item.quantity += q;
    item.amount += amt;
  }

  // 金額を丸め、商品を廃棄数降順でソート
  const daily = [...dailyMap.values()]
    .map((row) => {
      row.totalAmount = round2(row.totalAmount);
      for (const cat of Object.values(row.byCategory)) {
        cat.amount = round2(cat.amount);
        cat.items.sort((a, b) => b.quantity - a.quantity);
        for (const it of cat.items) it.amount = round2(it.amount);
      }
      return row;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return Response.json({ view: "daily", rows: daily });
}
