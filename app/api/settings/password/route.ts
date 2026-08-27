import { authErrorResponse, getCurrentStoreContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  hashSettingsPassword,
  verifySettingsPassword,
} from "@/lib/settings-password";

export async function PATCH(request: Request) {
  try {
    const context = await getCurrentStoreContext();
    let body: { currentPassword?: string; newPassword?: string };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "invalid json" }, { status: 400 });
    }

    const currentPassword = body.currentPassword ?? "";
    const newPassword = body.newPassword ?? "";
    if (newPassword.length < 4) {
      return Response.json(
        { error: "settings password must be at least 4 characters" },
        { status: 400 },
      );
    }

    const store = await prisma.store.findUnique({
      where: { id: context.store.id },
      select: { settingsPasswordHash: true },
    });

    if (!verifySettingsPassword(currentPassword, store?.settingsPasswordHash)) {
      return Response.json({ error: "invalid current password" }, { status: 403 });
    }

    await prisma.store.update({
      where: { id: context.store.id },
      data: { settingsPasswordHash: hashSettingsPassword(newPassword) },
    });

    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
