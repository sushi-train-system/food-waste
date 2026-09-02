import {
  authErrorResponse,
  getCurrentStoreContext,
  requireSettingsAccess,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ensureStoreTimeSlots,
  normalizeStartHour,
  toTimeSlotDTO,
} from "@/lib/time-slots";

export async function GET() {
  try {
    const context = await getCurrentStoreContext();
    const slots = await ensureStoreTimeSlots(context.store.id);
    return Response.json(slots.map(toTimeSlotDTO));
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentStoreContext();
    await requireSettingsAccess(context);

    let body: { startHour?: unknown };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "invalid json" }, { status: 400 });
    }

    const startHour = normalizeStartHour(body.startHour);
    if (startHour === null) {
      return Response.json({ error: "invalid start hour" }, { status: 400 });
    }

    const existing = await prisma.timeSlot.findUnique({
      where: {
        storeId_startHour: {
          storeId: context.store.id,
          startHour,
        },
      },
      select: { id: true },
    });
    if (existing) {
      return Response.json({ error: "time slot already exists" }, { status: 409 });
    }

    const max = await prisma.timeSlot.aggregate({
      where: { storeId: context.store.id },
      _max: { sortOrder: true },
    });

    const slot = await prisma.timeSlot.create({
      data: {
        storeId: context.store.id,
        startHour,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
      },
    });

    return Response.json(toTimeSlotDTO(slot), { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
