import { cookies } from "next/headers";
import { authErrorResponse, getCurrentStoreContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createSettingsUnlockCookieValue,
  SETTINGS_UNLOCK_COOKIE,
  verifySettingsPassword,
} from "@/lib/settings-password";

export async function POST(request: Request) {
  try {
    const context = await getCurrentStoreContext();
    let body: { password?: string };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "invalid json" }, { status: 400 });
    }

    const store = await prisma.store.findUnique({
      where: { id: context.store.id },
      select: { settingsPasswordHash: true },
    });

    if (!verifySettingsPassword(body.password ?? "", store?.settingsPasswordHash)) {
      return Response.json({ error: "invalid settings password" }, { status: 403 });
    }

    const cookieStore = await cookies();
    cookieStore.set(
      SETTINGS_UNLOCK_COOKIE,
      createSettingsUnlockCookieValue(context.store.id, context.appUser.id),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 8,
      },
    );

    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE() {
  try {
    await getCurrentStoreContext();
    const cookieStore = await cookies();
    cookieStore.set(SETTINGS_UNLOCK_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
