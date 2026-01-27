// Lovable Cloud Function: HuraPayments postback (webhook)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...corsHeaders,
      "content-type": "application/json; charset=utf-8",
      ...(init.headers ?? {}),
    },
  });
}

function normalizeStatus(s: unknown) {
  return typeof s === "string" ? s.trim().toLowerCase() : "";
}

function isPaidStatus(s: string) {
  // We will refine this mapping after you test against real Hura statuses.
  return ["paid", "approved", "confirmed", "success", "completed"].includes(s);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Método não permitido" }, { status: 405 });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing backend credentials env vars");
      return json({ ok: false, error: "Backend não configurado." }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const payloadText = await req.text();
    let payload: any = null;
    try {
      payload = payloadText ? JSON.parse(payloadText) : {};
    } catch {
      payload = { raw: payloadText };
    }

    // Heuristic parsing; adjust later with real postback format
    const providerTransactionId =
      payload?.id ?? payload?.transaction_id ?? payload?.transactionId ?? payload?.data?.id ?? payload?.data?.transaction_id;

    const metadata = payload?.metadata ?? payload?.data?.metadata ?? {};
    const bookingId = metadata?.booking_id ?? metadata?.bookingId;

    const status = normalizeStatus(payload?.status ?? payload?.data?.status);

    console.log("Hura postback received", {
      providerTransactionId,
      bookingId,
      status,
    });

    // Update payment_transactions best-effort
    if (providerTransactionId) {
      const { error: txErr } = await supabase
        .from("payment_transactions")
        .update({
          status: status || "updated",
          raw: payload as never,
        })
        .eq("provider", "hurapayments")
        .eq("provider_transaction_id", String(providerTransactionId));

      if (txErr) console.error("Failed to update payment_transactions", txErr);
    }

    // Confirm booking on paid status
    if (bookingId && isPaidStatus(status)) {
      const { error: bookingErr } = await supabase
        .from("bookings")
        .update({ payment_status: "paid", paid_at: new Date().toISOString() })
        .eq("id", String(bookingId));

      if (bookingErr) {
        console.error("Failed to update booking", bookingErr);
        return json({ ok: false, error: "Falha ao confirmar reserva" }, { status: 500 });
      }

      return json({ ok: true, updated: "booking_paid" });
    }

    return json({ ok: true });
  } catch (e) {
    console.error("Unexpected error", e);
    return json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
});
