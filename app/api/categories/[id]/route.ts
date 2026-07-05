import { prisma } from "@/lib/prisma";

// カテゴリ更新 body: { name?, sortOrder? }
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/categories/[id]">,
) {
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

  const updated = await prisma.category.update({ where: { id }, data });
  return Response.json(updated);
}

// カテゴリ削除（配下のメニュー・入力データも cascade で削除）
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/categories/[id]">,
) {
  const { id } = await ctx.params;
  await prisma.category.delete({ where: { id } });
  return Response.json({ ok: true });
}
