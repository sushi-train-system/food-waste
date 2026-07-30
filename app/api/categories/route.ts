import { prisma } from "@/lib/prisma";
import { getDefaultStore } from "@/lib/store";
import type { AdminCategory } from "@/lib/types";

// 管理用: 全カテゴリ + 全メニュー（無効含む）
export async function GET() {
  const store = await getDefaultStore();
  const categories = await prisma.category.findMany({
    where: { storeId: store.id },
    orderBy: { sortOrder: "asc" },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  const result: AdminCategory[] = categories.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    sortOrder: c.sortOrder,
    items: c.items.map((i) => ({
      id: i.id,
      name: i.name,
      sortOrder: i.sortOrder,
      active: i.active,
      priceAud: i.priceAud,
    })),
  }));

  return Response.json(result);
}

function genSlug() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// カテゴリ作成 body: { name }
export async function POST(request: Request) {
  const store = await getDefaultStore();
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
    where: { storeId: store.id },
    _max: { sortOrder: true },
  });
  const sortOrder = (max._max.sortOrder ?? -1) + 1;

  const category = await prisma.category.create({
    data: { storeId: store.id, name, slug: genSlug(), sortOrder },
  });

  return Response.json(category, { status: 201 });
}
