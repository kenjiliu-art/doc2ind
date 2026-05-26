import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const FREE_EXPORT_LIMIT = 3;

export const getUsageInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ count }, { data: roles }] = await Promise.all([
      supabase
        .from("export_events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    const isAdmin = !!roles?.some((r) => r.role === "admin");
    const used = count ?? 0;
    return {
      used,
      limit: FREE_EXPORT_LIMIT,
      isAdmin,
      remaining: isAdmin ? Infinity : Math.max(0, FREE_EXPORT_LIMIT - used),
    };
  });

export const recordExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ kind: z.string().min(1).max(32) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = !!roles?.some((r) => r.role === "admin");

    if (!isAdmin) {
      const { count } = await supabase
        .from("export_events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      if ((count ?? 0) >= FREE_EXPORT_LIMIT) {
        return {
          allowed: false,
          used: count ?? 0,
          limit: FREE_EXPORT_LIMIT,
          isAdmin: false,
        };
      }
    }

    const { error } = await supabase
      .from("export_events")
      .insert({ user_id: userId, kind: data.kind });
    if (error) throw new Error(error.message);

    const { count: newCount } = await supabase
      .from("export_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    return {
      allowed: true,
      used: newCount ?? 0,
      limit: FREE_EXPORT_LIMIT,
      isAdmin,
    };
  });
