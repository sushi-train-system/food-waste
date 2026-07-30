import { prisma } from "@/lib/prisma";
import { getDefaultStore } from "@/lib/store";

// メニュー更新 body: { name?, active?, sortOrder?, priceAud? }
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/items/[id]">,
) {
  const store = await getDefaultStore();
  const { id } = await ctx.params;
  let body: {
    name?: string;
    active?: boolean;
    sortOrder?: number;
    priceAud?: number;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const data: {
    name?: string;
    active?: boolean;
    sortOrder?: number;
    priceAud?: number;
  } = {};
  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
  }
  if (typeof body.active === "boolean") data.active = body.active;
  if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder;
  if (typeof body.priceAud === "number" && body.priceAud >= 0) {
    data.priceAud = body.priceAud;
  }

  if (Object.keys(data).length === 0) {
    return Response.json({ error: "nothing to update" }, { status: 400 });
  }

  const existing = await prisma.menuItem.findFirst({
    where: { id, storeId: store.id },
  });
  if (!existing) {
    return Response.json({ error: "menu item not found" }, { status: 404 });
  }

  const updated = await prisma.menuItem.update({ where: { id }, data });
  return Response.json(updated);
}

// メニュー削除（入力データも cascade で削除）
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/items/[id]">,
) {
  const store = await getDefaultStore();
  const { id } = await ctx.params;
  const result = await prisma.menuItem.deleteMany({
    where: { id, storeId: store.id },
  });
  if (result.count === 0) {
    return Response.json({ error: "menu item not found" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
