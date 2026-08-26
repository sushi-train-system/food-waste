import {
  authErrorResponse,
  getCurrentAppUser,
  getCurrentStoreContext,
  StoreAccessRequiredError,
} from "@/lib/auth";

export async function GET() {
  try {
    const context = await getCurrentStoreContext();
    return Response.json({
      user: context.appUser,
      store: context.store,
      role: context.role,
    });
  } catch (error) {
    if (error instanceof StoreAccessRequiredError) {
      const appUser = await getCurrentAppUser();
      return Response.json({
        user: {
          id: appUser.id,
          email: appUser.email,
          name: appUser.name,
        },
        store: null,
        role: null,
      });
    }
    return authErrorResponse(error);
  }
}
