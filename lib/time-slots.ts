import { TIME_SLOTS } from "./config";
import { prisma } from "./prisma";
import type { TimeSlotDTO } from "./types";

export function normalizeStartHour(value: unknown) {
  const startHour = Math.floor(Number(value));
  if (!Number.isFinite(startHour) || startHour < 0 || startHour > 23) {
    return null;
  }
  return startHour;
}

export async function ensureStoreTimeSlots(storeId: string) {
  const existing = await prisma.timeSlot.findMany({
    where: { storeId },
    orderBy: [{ sortOrder: "asc" }, { startHour: "asc" }],
  });
  if (existing.length > 0) return existing;

  await prisma.timeSlot.createMany({
    data: TIME_SLOTS.map((startHour, index) => ({
      storeId,
      startHour,
      sortOrder: index,
    })),
    skipDuplicates: true,
  });

  return prisma.timeSlot.findMany({
    where: { storeId },
    orderBy: [{ sortOrder: "asc" }, { startHour: "asc" }],
  });
}

export function toTimeSlotDTO(slot: {
  id: string;
  startHour: number;
  sortOrder: number;
}): TimeSlotDTO {
  return {
    id: slot.id,
    startHour: slot.startHour,
    sortOrder: slot.sortOrder,
  };
}
