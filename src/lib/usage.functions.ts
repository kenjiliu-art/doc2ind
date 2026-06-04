import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Free tier no longer includes any exports — paid entitlement required.
export const FREE_EXPORT_LIMIT = 0;

type PaddleEnv = "sandbox" | "live";

async function loadEntitlement(supabase: any, userId: string, env: PaddleEnv) {
  const { data: purchases } = await supabase
    .from("purchases")
    .select("kind, expires_at")
    .eq("user_id", userId)
    .eq("environment", env);
  const now = Date.now();
  const lifetime = purchases?.find((p: any) => p.kind === "lifetime");
  const dayPass = purchases?.find(
    (p: any) =>
      p.kind === "day_pass" &&
      p.expires_at &&
      new Date(p.expires_at).getTime() > now,
  );
  return {
    hasAccess: !!(lifetime || dayPass),
    kind: lifetime ? "lifetime" : dayPass ? "day_pass" : null,
    expiresAt: dayPass?.expires_at ?? null,
  } as {
    hasAccess: boolean;
    kind: "lifetime" | "day_pass" | null;
    expiresAt: string | null;
  };
}

export const getUsageInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: PaddleEnv }) =>
    z.object({ environment: z.enum(["sandbox", "live"]) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ count }, { data: roles }, entitlement] = await Promise.all([
      supabase
        .from("export_events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      loadEntitlement(supabase, userId, data.environment),
    ]);
    const isAdmin = !!roles?.some((r: any) => r.role === "admin");
    return {
      used: count ?? 0,
      limit: FREE_EXPORT_LIMIT,
      isAdmin,
      hasAccess: isAdmin || entitlement.hasAccess,
      entitlementKind: entitlement.kind,
      entitlementExpiresAt: entitlement.expiresAt,
    };
  });

export const recordExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        kind: z.string().min(1).max(32),
        environment: z.enum(["sandbox", "live"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = !!roles?.some((r: any) => r.role === "admin");

    const entitlement = isAdmin
      ? { hasAccess: true, kind: "lifetime" as const }
      : await loadEntitlement(supabase, userId, data.environment);

    if (!entitlement.hasAccess) {
      return {
        allowed: false,
        isAdmin,
        hasAccess: false,
      };
    }

    const { error } = await supabase
      .from("export_events")
      .insert({ user_id: userId, kind: data.kind });
    if (error) throw new Error(error.message);

    return { allowed: true, isAdmin, hasAccess: true };
  });
