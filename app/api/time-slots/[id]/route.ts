import {
  authErrorResponse,
  getCurrentStoreContext,
  requireSettingsAccess,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeStartHour, toTimeSlotDTO } from "@/lib/time-slots";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await getCurrentStoreContext();
    await requireSettingsAccess(context);
    const { id } = await params;

    let body: { startHour?: unknown; sortOrder?: unknown; active?: unknown };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "invalid json" }, { status: 400 });
    }

    const data: { startHour?: number; sortOrder?: number; active?: boolean } = {};
    if (body.startHour !== undefined) {
      const startHour = normalizeStartHour(body.startHour);
      if (startHour === null) {
        return Response.json({ error: "invalid start hour" }, { status: 400 });
      }
      const duplicate = await prisma.timeSlot.findUnique({
        where: {
          storeId_startHour: {
            storeId: context.store.id,
            startHour,
          },
        },
        select: { id: true },
      });
      if (duplicate && duplicate.id !== id) {
        return Response.json(
          { error: "time slot already exists" },
          { status: 409 },
        );
      }
      data.startHour = startHour;
    }
    if (body.sortOrder !== undefined) {
      const sortOrder = Math.floor(Number(body.sortOrder));
      if (!Number.isFinite(sortOrder) || sortOrder < 0) {
        return Response.json({ error: "invalid sort order" }, { status: 400 });
      }
      data.sortOrder = sortOrder;
    }
    if (body.active !== undefined) {
      if (typeof body.active !== "boolean") {
        return Response.json({ error: "invalid active" }, { status: 400 });
      }
      data.active = body.active;
    }

    const existing = await prisma.timeSlot.findFirst({
      where: { id, storeId: context.store.id },
      select: { id: true },
    });
    if (!existing) {
      return Response.json({ error: "time slot not found" }, { status: 404 });
    }

    const slot = await prisma.timeSlot.update({
      where: { id },
      data,
    });

    return Response.json(toTimeSlotDTO(slot));
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await getCurrentStoreContext();
    await requireSettingsAccess(context);
    const { id } = await params;

    await prisma.timeSlot.deleteMany({
      where: { id, storeId: context.store.id },
    });

    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
