import type { StoreRole } from "@prisma/client";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import {
  isValidSettingsUnlockCookie,
  SETTINGS_UNLOCK_COOKIE,
} from "./settings-password";
import { getDefaultStore } from "./store";
import { hasSupabaseConfig } from "./supabase/config";
import { createSupabaseServerClient } from "./supabase/server";

export type CurrentStoreContext = {
  appUser: {
    id: string;
    email: string;
    name: string | null;
  };
  store: {
    id: string;
    slug: string;
    name: string;
    timezone: string;
  };
  role: StoreRole;
};

export class AuthRequiredError extends Error {
  constructor() {
    super("Authentication required");
  }
}

export class StoreAccessRequiredError extends Error {
  constructor() {
    super("Store access required");
  }
}

export class PermissionDeniedError extends Error {
  constructor() {
    super("Permission denied");
  }
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthRequiredError) {
    return Response.json({ error: "authentication required" }, { status: 401 });
  }
  if (error instanceof StoreAccessRequiredError) {
    return Response.json({ error: "store access required" }, { status: 403 });
  }
  if (error instanceof PermissionDeniedError) {
    return Response.json({ error: "permission denied" }, { status: 403 });
  }
  throw error;
}

export async function getCurrentAppUser() {
  if (!hasSupabaseConfig()) {
    throw new AuthRequiredError();
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    throw new AuthRequiredError();
  }

  const email = user.email.trim().toLowerCase();
  return prisma.appUser.upsert({
    where: { email },
    update: {
      authUserId: user.id,
      name: user.user_metadata?.name ?? undefined,
    },
    create: {
      email,
      authUserId: user.id,
      name: user.user_metadata?.name ?? undefined,
    },
  });
}

export async function getCurrentStoreContext(): Promise<CurrentStoreContext> {
  const appUser = await getCurrentAppUser();
  const membership = await prisma.storeUser.findFirst({
    where: { userId: appUser.id, active: true },
    orderBy: { createdAt: "asc" },
    include: { store: true },
  });

  if (!membership) {
    throw new StoreAccessRequiredError();
  }

  return {
    appUser: {
      id: appUser.id,
      email: appUser.email,
      name: appUser.name,
    },
    store: {
      id: membership.store.id,
      slug: membership.store.slug,
      name: membership.store.name,
      timezone: membership.store.timezone,
    },
    role: membership.role,
  };
}

export async function getRequestStore() {
  return (await getCurrentStoreContext()).store;
}

export function requireOwner(context: CurrentStoreContext) {
  if (context.role !== "OWNER") {
    throw new PermissionDeniedError();
  }
}

export function requireManagerOrOwner(context: CurrentStoreContext) {
  if (context.role !== "OWNER" && context.role !== "MANAGER") {
    throw new PermissionDeniedError();
  }
}

export async function requireSettingsAccess(context: CurrentStoreContext) {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(SETTINGS_UNLOCK_COOKIE)?.value;
  if (
    !isValidSettingsUnlockCookie(
      cookieValue,
      context.store.id,
      context.appUser.id,
    )
  ) {
    throw new PermissionDeniedError();
  }
}

export async function getRequestStoreOrDefault() {
  if (!hasSupabaseConfig()) {
    return getDefaultStore();
  }
  return getRequestStore();
}
