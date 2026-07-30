import { prisma } from "@/lib/prisma";
import { getDefaultStore } from "@/lib/store";

// カテゴリ更新 body: { name?, sortOrder? }
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/categories/[id]">,
) {
  const store = await getDefaultStore();
  const { id } = await ctx.params;
  let body: { name?: string; sortOrder?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const data: { name?: string; sortOrder?: number } = {};
  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
  }
  if (typeof body.sortOrder === "number") {
    data.sortOrder = body.sortOrder;
  }
  if (Object.keys(data).length === 0) {
    return Response.json({ error: "nothing to update" }, { status: 400 });
  }

  const existing = await prisma.category.findFirst({
    where: { id, storeId: store.id },
  });
  if (!existing) {
    return Response.json({ error: "category not found" }, { status: 404 });
  }

  const updated = await prisma.category.update({ where: { id }, data });
  return Response.json(updated);
}

// カテゴリ削除（配下のメニュー・入力データも cascade で削除）
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/categories/[id]">,
) {
  const store = await getDefaultStore();
  const { id } = await ctx.params;
  const result = await prisma.category.deleteMany({
    where: { id, storeId: store.id },
  });
  if (result.count === 0) {
    return Response.json({ error: "category not found" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
