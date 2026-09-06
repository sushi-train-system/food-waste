import { prisma } from "@/lib/prisma";
import { weekdayIndexFromDate } from "@/lib/config";
import { authErrorResponse, getRequestStore } from "@/lib/auth";
import type { DailyRow, RawRow } from "@/lib/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const round2 = (n: number) => Math.round(n * 100) / 100;
type PriceMode = "entry" | "monthEnd";

function monthEndFromDate(date: string) {
  const [year, monthIndex] = date.split("-").map(Number);
  const lastDay = new Date(year, monthIndex, 0).getDate();
  return `${date.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;
}

function priceAtMonthEnd(
  histories: Map<string, { effectiveFrom: string; priceAud: number }[]>,
  menuItemId: string,
  monthEnd: string,
  fallback: number,
) {
  const itemHistories = histories.get(menuItemId) ?? [];
  let price = fallback;
  for (const history of itemHistories) {
    if (history.effectiveFrom > monthEnd) break;
    price = history.priceAud;
  }
  return price;
}

// GET /api/data?view=raw|daily&start=YYYY-MM-DD&end=YYYY-MM-DD
export async function GET(request: Request) {
  try {
    const store = await getRequestStore();
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") === "daily" ? "daily" : "raw";
    const priceMode: PriceMode =
      searchParams.get("priceMode") === "monthEnd" ? "monthEnd" : "entry";
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    const dateFilter: { gte?: string; lte?: string } = {};
    if (start && DATE_RE.test(start)) dateFilter.gte = start;
    if (end && DATE_RE.test(end)) dateFilter.lte = end;

    const rows = await prisma.wasteEntry.findMany({
      where: {
        storeId: store.id,
        ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
      },
      select: {
        date: true,
        slot: true,
        quantity: true,
        unitPriceAud: true,
        menuItem: {
          select: {
            id: true,
            name: true,
            priceAud: true,
            sortOrder: true,
            category: { select: { name: true, sortOrder: true } },
          },
        },
      },
      orderBy: [{ date: "asc" }, { slot: "asc" }],
    });

    const menuItemIds = [...new Set(rows.map((row) => row.menuItem.id))];
    const latestMonthEnd = rows
      .map((row) => monthEndFromDate(row.date))
      .sort()
      .at(-1);
    const priceHistories = new Map<
      string,
      { effectiveFrom: string; priceAud: number }[]
    >();

    if (priceMode === "monthEnd" && menuItemIds.length > 0 && latestMonthEnd) {
      const histories = await prisma.menuItemPriceHistory.findMany({
        where: {
          storeId: store.id,
          menuItemId: { in: menuItemIds },
          effectiveFrom: { lte: latestMonthEnd },
        },
        select: {
          menuItemId: true,
          effectiveFrom: true,
          priceAud: true,
        },
        orderBy: [{ menuItemId: "asc" }, { effectiveFrom: "asc" }],
      });
      for (const history of histories) {
        const list = priceHistories.get(history.menuItemId) ?? [];
        list.push({
          effectiveFrom: history.effectiveFrom,
          priceAud: history.priceAud,
        });
        priceHistories.set(history.menuItemId, list);
      }
    }

    const unitPriceFor = (row: (typeof rows)[number]) =>
      priceMode === "monthEnd"
        ? priceAtMonthEnd(
            priceHistories,
            row.menuItem.id,
            monthEndFromDate(row.date),
            row.menuItem.priceAud,
          )
        : row.unitPriceAud;

    if (view === "raw") {
      const raw: RawRow[] = rows
        .toSorted(
          (a, b) =>
            a.date.localeCompare(b.date) ||
            a.slot - b.slot ||
            a.menuItem.category.sortOrder - b.menuItem.category.sortOrder ||
            a.menuItem.sortOrder - b.menuItem.sortOrder,
        )
        .map((r) => {
          const unitPriceAud = unitPriceFor(r);
          return {
            date: r.date,
            slot: r.slot,
            categoryName: r.menuItem.category.name,
            menuName: r.menuItem.name,
            quantity: r.quantity,
            priceAud: unitPriceAud,
            amount: round2(r.quantity * unitPriceAud),
          };
        });
      return Response.json({ view: "raw", rows: raw });
    }

    const dailyMap = new Map<string, DailyRow>();

    for (const r of rows) {
      const q = r.quantity;
      const amt = q * unitPriceFor(r);
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
  } catch (error) {
    return authErrorResponse(error);
  }
}
