import {
  authErrorResponse,
  getCurrentStoreContext,
  requireSettingsAccess,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { StoreRole } from "@prisma/client";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

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

export async function GET() {
  try {
    const context = await getCurrentStoreContext();
    await requireSettingsAccess(context);
    const members = await prisma.storeUser.findMany({
      where: { storeId: context.store.id },
      orderBy: [{ active: "desc" }, { createdAt: "asc" }],
      include: { user: true },
    });

    return Response.json(
      members.map((member) => serializeMember(member, context.appUser.id)),
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentStoreContext();
    await requireSettingsAccess(context);

    let body: { email?: string };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "invalid json" }, { status: 400 });
    }

    const email = normalizeEmail(body.email ?? "");
    const role: StoreRole = "STAFF";
    if (!email || !email.includes("@")) {
      return Response.json({ error: "valid email is required" }, { status: 400 });
    }
    const user = await prisma.appUser.upsert({
      where: { email },
      update: {},
      create: { email },
    });

    const member = await prisma.storeUser.upsert({
      where: {
        userId_storeId: {
          userId: user.id,
          storeId: context.store.id,
        },
      },
      update: { role, active: true },
      create: {
        userId: user.id,
        storeId: context.store.id,
        role,
        active: true,
      },
      include: { user: true },
    });

    return Response.json(serializeMember(member, context.appUser.id), {
      status: 201,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
