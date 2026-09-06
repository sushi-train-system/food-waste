import { prisma } from "@/lib/prisma";
import {
  authErrorResponse,
  getCurrentStoreContext,
  requireSettingsAccess,
} from "@/lib/auth";
import type { AdminCategory } from "@/lib/types";

// 管理用: 全カテゴリ + 全メニュー（無効含む）
export async function GET() {
  try {
    const context = await getCurrentStoreContext();
    await requireSettingsAccess(context);
    const categories = await prisma.category.findMany({
      where: { storeId: context.store.id },
      orderBy: { sortOrder: "asc" },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });

    const result: AdminCategory[] = categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      sortOrder: c.sortOrder,
      active: c.active,
      items: c.items.map((i) => ({
        id: i.id,
        name: i.name,
        sortOrder: i.sortOrder,
        active: i.active,
        priceAud: i.priceAud,
      })),
    }));

    return Response.json(result);
  } catch (error) {
    return authErrorResponse(error);
  }
}

function genSlug() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// カテゴリ作成 body: { name }
export async function POST(request: Request) {
  try {
    const context = await getCurrentStoreContext();
    await requireSettingsAccess(context);
    let body: { name?: string };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "invalid json" }, { status: 400 });
    }
    const name = body.name?.trim();
    if (!name) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }

    const max = await prisma.category.aggregate({
      where: { storeId: context.store.id },
      _max: { sortOrder: true },
    });
    const sortOrder = (max._max.sortOrder ?? -1) + 1;

    const category = await prisma.category.create({
      data: { storeId: context.store.id, name, slug: genSlug(), sortOrder },
    });

    return Response.json(category, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
