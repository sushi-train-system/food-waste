import { prisma } from "./prisma";
import {
  DEFAULT_STORE_NAME,
  DEFAULT_STORE_SLUG,
  DEFAULT_STORE_TIMEZONE,
  TIME_SLOTS,
} from "./config";

export async function getDefaultStore() {
  const existing = await prisma.store.findUnique({
    where: { slug: DEFAULT_STORE_SLUG },
  });
  if (existing) return existing;

  try {
    return await prisma.store.create({
      data: {
        slug: DEFAULT_STORE_SLUG,
        name: DEFAULT_STORE_NAME,
        timezone: DEFAULT_STORE_TIMEZONE,
        timeSlots: {
          create: TIME_SLOTS.map((startHour, index) => ({
            startHour,
            sortOrder: index,
          })),
        },
      },
    });
  } catch {
    return prisma.store.update({
      where: { slug: DEFAULT_STORE_SLUG },
      data: {
        slug: DEFAULT_STORE_SLUG,
        name: DEFAULT_STORE_NAME,
        timezone: DEFAULT_STORE_TIMEZONE,
      },
    });
  }
}
