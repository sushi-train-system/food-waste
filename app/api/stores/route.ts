import { getCurrentAppUser, authErrorResponse } from "@/lib/auth";
import {
  DEFAULT_STORE_SLUG,
  DEFAULT_STORE_TIMEZONE,
  TIME_SLOTS,
} from "@/lib/config";
import { prisma } from "@/lib/prisma";

function slugify(input: string) {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || `store-${Date.now().toString(36)}`;
}

async function uniqueStoreSlug(name: string) {
  const base = slugify(name);
  let slug = base;
  let suffix = 1;
  while (await prisma.store.findUnique({ where: { slug } })) {
    suffix++;
    slug = `${base}-${suffix}`;
  }
  return slug;
}

export async function POST(request: Request) {
  try {
    const appUser = await getCurrentAppUser();
    let body: { name?: string; timezone?: string };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "invalid json" }, { status: 400 });
    }

    const name = body.name?.trim();
    if (!name) {
      return Response.json({ error: "store name is required" }, { status: 400 });
    }

    const existingMembership = await prisma.storeUser.findFirst({
      where: { userId: appUser.id },
      include: { store: true },
    });
    if (existingMembership) {
      return Response.json({
        store: existingMembership.store,
        role: existingMembership.role,
      });
    }

    const store = await prisma.store.create({
      data: {
        slug: await uniqueStoreSlug(name),
        name,
        timezone: body.timezone?.trim() || DEFAULT_STORE_TIMEZONE,
        users: {
          create: {
            userId: appUser.id,
            role: "OWNER",
          },
        },
        timeSlots: {
          create: TIME_SLOTS.map((startHour, index) => ({
            startHour,
            sortOrder: index,
          })),
        },
      },
    });

    const templateStore = await prisma.store.findUnique({
      where: { slug: DEFAULT_STORE_SLUG },
      include: {
        categories: {
          orderBy: { sortOrder: "asc" },
          include: { items: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });

    if (templateStore && templateStore.id !== store.id) {
      for (const category of templateStore.categories) {
        const createdCategory = await prisma.category.create({
          data: {
            storeId: store.id,
            slug: category.slug,
            name: category.name,
            sortOrder: category.sortOrder,
            active: category.active,
          },
        });
        for (const item of category.items) {
          const createdItem = await prisma.menuItem.create({
            data: {
              storeId: store.id,
              categoryId: createdCategory.id,
              name: item.name,
              priceAud: item.priceAud,
              sortOrder: item.sortOrder,
              active: item.active,
            },
          });
          await prisma.menuItemPriceHistory.create({
            data: {
              storeId: store.id,
              menuItemId: createdItem.id,
              priceAud: item.priceAud,
              effectiveFrom: "0001-01-01",
            },
          });
        }
      }
    }

    return Response.json({ store, role: "OWNER" }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
