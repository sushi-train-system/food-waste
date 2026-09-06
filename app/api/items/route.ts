import { prisma } from "@/lib/prisma";
import { DEFAULT_PRICE_AUD, todayStr } from "@/lib/config";
import {
  authErrorResponse,
  getCurrentStoreContext,
  requireSettingsAccess,
} from "@/lib/auth";

// メニュー作成 body: { categoryId, name, priceAud? }
export async function POST(request: Request) {
  try {
    const context = await getCurrentStoreContext();
    await requireSettingsAccess(context);
    let body: { categoryId?: string; name?: string; priceAud?: number };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "invalid json" }, { status: 400 });
    }
    const name = body.name?.trim();
    const categoryId = body.categoryId;
    if (!name || !categoryId) {
      return Response.json(
        { error: "categoryId and name are required" },
        { status: 400 },
      );
    }

    const category = await prisma.category.findFirst({
      where: { id: categoryId, storeId: context.store.id },
    });
    if (!category) {
      return Response.json({ error: "category not found" }, { status: 404 });
    }

    const max = await prisma.menuItem.aggregate({
      where: { storeId: context.store.id, categoryId },
      _max: { sortOrder: true },
    });
    const sortOrder = (max._max.sortOrder ?? -1) + 1;

    const priceAud =
      typeof body.priceAud === "number" && body.priceAud >= 0
        ? body.priceAud
        : DEFAULT_PRICE_AUD;

    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.menuItem.create({
        data: {
          storeId: context.store.id,
          name,
          categoryId,
          sortOrder,
          priceAud,
        },
      });
      await tx.menuItemPriceHistory.create({
        data: {
          storeId: context.store.id,
          menuItemId: created.id,
          priceAud,
          effectiveFrom: todayStr(),
        },
      });
      return created;
    });

    return Response.json(item, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
