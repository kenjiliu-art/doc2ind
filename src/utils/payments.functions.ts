import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { gatewayFetch, type PaddleEnv } from "@/lib/paddle.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const resolvePaddlePrice = createServerFn({ method: "GET" })
  .inputValidator((data: { priceId: string; environment: PaddleEnv }) => data)
  .handler(async ({ data }) => {
    const response = await gatewayFetch(
      data.environment,
      `/prices?external_id=${encodeURIComponent(data.priceId)}`,
    );
    const result = (await response.json()) as { data?: Array<{ id: string }> };
    if (!result.data?.length) throw new Error("Price not found");
    return result.data[0].id;
  });

export const getEntitlement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: PaddleEnv }) =>
    z.object({ environment: z.enum(["sandbox", "live"]) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: purchases } = await supabase
      .from("purchases")
      .select("kind, expires_at, created_at")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false });

    const now = Date.now();
    const lifetime = purchases?.find((p) => p.kind === "lifetime");
    const activeDayPass = purchases?.find(
      (p) =>
        p.kind === "day_pass" &&
        p.expires_at &&
        new Date(p.expires_at).getTime() > now,
    );

    return {
      hasAccess: !!(lifetime || activeDayPass),
      kind: lifetime ? "lifetime" : activeDayPass ? "day_pass" : null,
      expiresAt: activeDayPass?.expires_at ?? null,
    };
  });
