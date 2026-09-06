import { prisma } from "@/lib/prisma";
import { authErrorResponse, getRequestStore } from "@/lib/auth";
import type { CategoryDTO } from "@/lib/types";

export async function GET() {
  try {
    const store = await getRequestStore();
    const categories = await prisma.category.findMany({
      where: { storeId: store.id, active: true },
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
      active: c.active,
      items: c.items.map((i) => ({
        id: i.id,
        name: i.name,
        sortOrder: i.sortOrder,
        priceAud: i.priceAud,
      })),
    }));

    return Response.json(result);
  } catch (error) {
    return authErrorResponse(error);
  }
}
