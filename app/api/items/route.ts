import { prisma } from "@/lib/prisma";
import { DEFAULT_PRICE_AUD } from "@/lib/config";
import { getDefaultStore } from "@/lib/store";

// メニュー作成 body: { categoryId, name, priceAud? }
export async function POST(request: Request) {
  const store = await getDefaultStore();
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
    where: { id: categoryId, storeId: store.id },
  });
  if (!category) {
    return Response.json({ error: "category not found" }, { status: 404 });
  }

  const max = await prisma.menuItem.aggregate({
    where: { storeId: store.id, categoryId },
    _max: { sortOrder: true },
  });
  const sortOrder = (max._max.sortOrder ?? -1) + 1;

  const item = await prisma.menuItem.create({
    data: {
      storeId: store.id,
      name,
      categoryId,
      sortOrder,
      priceAud:
        typeof body.priceAud === "number" && body.priceAud >= 0
          ? body.priceAud
          : DEFAULT_PRICE_AUD,
    },
  });

  return Response.json(item, { status: 201 });
}
