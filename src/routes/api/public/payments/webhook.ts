import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { verifyWebhook, EventName, type PaddleEnv } from "@/lib/paddle.server";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

const DAY_PASS_PRICE_ID = "day_pass_one_time";
const LIFETIME_PRICE_ID = "lifetime_one_time";

async function handleTransactionCompleted(data: any, env: PaddleEnv) {
  const userId = data.customData?.userId;
  if (!userId) {
    console.warn("Skipping transaction: no userId in customData");
    return;
  }
  const item = data.items?.[0];
  const priceExternalId = item?.price?.importMeta?.externalId;
  if (!priceExternalId) {
    console.warn("Skipping transaction: missing price importMeta.externalId");
    return;
  }

  let kind: "day_pass" | "lifetime";
  let expiresAt: string | null = null;
  if (priceExternalId === DAY_PASS_PRICE_ID) {
    kind = "day_pass";
    expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  } else if (priceExternalId === LIFETIME_PRICE_ID) {
    kind = "lifetime";
  } else {
    console.warn("Unknown price external id:", priceExternalId);
    return;
  }

  // Look up product external id via price (transactions only carry price).
  const productExternalId =
    item?.price?.productId === "lifetime_unlock" || kind === "lifetime"
      ? "lifetime_unlock"
      : "day_pass";

  await getSupabase()
    .from("purchases")
    .upsert(
      {
        user_id: userId,
        paddle_transaction_id: data.id,
        paddle_customer_id: data.customerId ?? null,
        price_id: priceExternalId,
        product_id: productExternalId,
        kind,
        expires_at: expiresAt,
        environment: env,
      },
      { onConflict: "paddle_transaction_id" },
    );
}

async function handleWebhook(req: Request, env: PaddleEnv) {
  const event = await verifyWebhook(req, env);
  if (event.eventType === EventName.TransactionCompleted) {
    await handleTransactionCompleted(event.data, env);
  } else {
    console.log("Unhandled event:", event.eventType);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const env = (url.searchParams.get("env") || "sandbox") as PaddleEnv;
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
