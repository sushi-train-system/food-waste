import { prisma } from "@/lib/prisma";
import { authErrorResponse, getRequestStore } from "@/lib/auth";
import { ensureStoreTimeSlots } from "@/lib/time-slots";
import type { EntryDTO, SaveEntriesBody } from "@/lib/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// 指定した日付・スロットの入力値を返す
// GET /api/entries?date=YYYY-MM-DD&slot=10
export async function GET(request: Request) {
  try {
    const store = await getRequestStore();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const slotParam = searchParams.get("slot");

    if (!date || !DATE_RE.test(date)) {
      return Response.json({ error: "invalid date" }, { status: 400 });
    }
    const slot = Number(slotParam);
    const validSlots = (await ensureStoreTimeSlots(store.id)).filter(
      (timeSlot) => timeSlot.active !== false,
    );
    if (
      !Number.isFinite(slot) ||
      !validSlots.some((timeSlot) => timeSlot.startHour === slot)
    ) {
      return Response.json({ error: "invalid slot" }, { status: 400 });
    }

    const rows = await prisma.wasteEntry.findMany({
      where: { storeId: store.id, date, slot },
      select: { menuItemId: true, quantity: true },
    });

    const entries: EntryDTO[] = rows.map((r) => ({
      menuItemId: r.menuItemId,
      quantity: r.quantity,
    }));

    return Response.json({ date, slot, entries });
  } catch (error) {
    return authErrorResponse(error);
  }
}

// 入力値を一括保存（upsert）。quantity=0 は削除。
// POST /api/entries  body: { date, slot, entries: [{menuItemId, quantity}] }
export async function POST(request: Request) {
  try {
    const store = await getRequestStore();
    let body: SaveEntriesBody;
    try {
      body = (await request.json()) as SaveEntriesBody;
    } catch {
      return Response.json({ error: "invalid json" }, { status: 400 });
    }

    const { date, slot, entries } = body ?? {};
    if (!date || !DATE_RE.test(date)) {
      return Response.json({ error: "invalid date" }, { status: 400 });
    }
    const validSlots = (await ensureStoreTimeSlots(store.id)).filter(
      (timeSlot) => timeSlot.active !== false,
    );
    if (
      !Number.isFinite(slot) ||
      !validSlots.some((timeSlot) => timeSlot.startHour === slot)
    ) {
      return Response.json({ error: "invalid slot" }, { status: 400 });
    }
    if (!Array.isArray(entries)) {
      return Response.json({ error: "invalid entries" }, { status: 400 });
    }

    const menuItemIds = entries.map((e) => e.menuItemId);
    const validItems = await prisma.menuItem.findMany({
      where: { storeId: store.id, id: { in: menuItemIds } },
      select: { id: true, priceAud: true },
    });
    const validItemPrices = new Map(validItems.map((i) => [i.id, i.priceAud]));

    const ops = entries.flatMap((e) => {
      const unitPriceAud = validItemPrices.get(e.menuItemId);
      if (unitPriceAud === undefined) return [];
      const quantity = Math.max(0, Math.floor(Number(e.quantity) || 0));
      if (quantity <= 0) {
        return prisma.wasteEntry.deleteMany({
          where: { storeId: store.id, menuItemId: e.menuItemId, date, slot },
        });
      }
      return prisma.wasteEntry.upsert({
        where: {
          storeId_menuItemId_date_slot: {
            storeId: store.id,
            menuItemId: e.menuItemId,
            date,
            slot,
          },
        },
        update: { quantity, unitPriceAud },
        create: {
          storeId: store.id,
          menuItemId: e.menuItemId,
          date,
          slot,
          quantity,
          unitPriceAud,
        },
      });
    });

    await prisma.$transaction(ops);

    return Response.json({ ok: true, saved: ops.length });
  } catch (error) {
    return authErrorResponse(error);
  }
}
