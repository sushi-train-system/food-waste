import {
  authErrorResponse,
  getCurrentStoreContext,
  requireSettingsAccess,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { StoreRole } from "@prisma/client";

function serializeMember(
  member: {
    id: string;
    role: StoreRole;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    user: { id: string; email: string; name: string | null };
  },
  currentUserId: string,
) {
  return {
    id: member.id,
    email: member.user.email,
    name: member.user.name,
    role: member.role,
    active: member.active,
    isCurrentUser: member.user.id === currentUserId,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
  };
}

async function wouldRemoveLastOwner(storeId: string, memberId: string) {
  const owners = await prisma.storeUser.count({
    where: {
      storeId,
      active: true,
      role: "OWNER",
      id: { not: memberId },
    },
  });
  return owners === 0;
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const context = await getCurrentStoreContext();
    await requireSettingsAccess(context);
    const { id } = await ctx.params;

    let body: { active?: boolean };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "invalid json" }, { status: 400 });
    }

    const existing = await prisma.storeUser.findFirst({
      where: { id, storeId: context.store.id },
      include: { user: true },
    });
    if (!existing) {
      return Response.json({ error: "member not found" }, { status: 404 });
    }
    const data: { active?: boolean } = {};
    if (typeof body.active === "boolean") {
      data.active = body.active;
    }
    if (Object.keys(data).length === 0) {
      return Response.json({ error: "nothing to update" }, { status: 400 });
    }

    const removingOwner =
      existing.role === "OWNER" && data.active === false;
    if (removingOwner && (await wouldRemoveLastOwner(context.store.id, id))) {
      return Response.json(
        { error: "at least one active owner is required" },
        { status: 400 },
      );
    }

    const updated = await prisma.storeUser.update({
      where: { id },
      data,
      include: { user: true },
    });

    return Response.json(serializeMember(updated, context.appUser.id));
  } catch (error) {
    return authErrorResponse(error);
  }
}
