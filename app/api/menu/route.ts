import { prisma } from "@/lib/prisma";
import { getDefaultStore } from "@/lib/store";
import type { CategoryDTO } from "@/lib/types";

export async function GET() {
  const store = await getDefaultStore();
  const categories = await prisma.category.findMany({
    where: { storeId: store.id },
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const result: CategoryDTO[] = categories.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    sortOrder: c.sortOrder,
    items: c.items.map((i) => ({
      id: i.id,
      name: i.name,
      sortOrder: i.sortOrder,
      priceAud: i.priceAud,
    })),
  }));

  return Response.json(result);
}
