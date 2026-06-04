import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type PaddleEnv = "sandbox" | "live";

export const getAccountOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: PaddleEnv }) =>
    z.object({ environment: z.enum(["sandbox", "live"]) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: purchases }, { data: failures }, { data: roles }] =
      await Promise.all([
        supabase
          .from("purchases")
          .select(
            "id, paddle_transaction_id, kind, price_id, product_id, expires_at, created_at, environment",
          )
          .eq("user_id", userId)
          .eq("environment", data.environment)
          .order("created_at", { ascending: false }),
        supabase
          .from("payment_failures")
          .select("id, paddle_transaction_id, reason, created_at")
          .eq("user_id", userId)
          .eq("environment", data.environment)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);

    const now = Date.now();
    const lifetime = purchases?.find((p: any) => p.kind === "lifetime");
    const dayPass = purchases?.find(
      (p: any) =>
        p.kind === "day_pass" &&
        p.expires_at &&
        new Date(p.expires_at).getTime() > now,
    );
    const isAdmin = !!roles?.some((r: any) => r.role === "admin");

    return {
      isAdmin,
      entitlement: {
        kind: lifetime ? "lifetime" : dayPass ? "day_pass" : null,
        expiresAt: dayPass?.expires_at ?? null,
        hasAccess: !!(lifetime || dayPass || isAdmin),
      },
      purchases: purchases ?? [],
      failures: failures ?? [],
    };
  });

export const deleteOwnAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    // Delete user-owned rows first (no FK cascade configured on these tables).
    await supabaseAdmin.from("export_events").delete().eq("user_id", userId);
    await supabaseAdmin.from("payment_failures").delete().eq("user_id", userId);
    await supabaseAdmin.from("purchases").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
