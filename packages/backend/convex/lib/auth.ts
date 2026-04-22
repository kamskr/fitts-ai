import type { MutationCtx, QueryCtx } from "../_generated/server";

type AuthCtx = Pick<QueryCtx, "auth"> | Pick<MutationCtx, "auth">;

export async function getCurrentUserId(ctx: AuthCtx) {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.tokenIdentifier ?? null;
}

export async function requireCurrentUserId(ctx: AuthCtx) {
  const userId = await getCurrentUserId(ctx);
  if (!userId) {
    throw new Error("User not found");
  }
  return userId;
}
