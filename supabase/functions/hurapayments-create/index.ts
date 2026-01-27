// Lovable Cloud Function: Create PIX transaction on HuraPayments
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CreatePixRequest = {
  bookingId: string;
  amountCents: number;
  guest: {
    name: string;
    email: string;
    phone: string;
    cpf?: string;
  };
  items: Array<{ title: string; quantity: number; unitPrice: number }>;
  metadata?: Record<string, unknown>;
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

function badRequest(message: string) {
  return json({ ok: false, error: message }, { status: 400 });
}

function assertNonEmptyString(value: unknown, field: string): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return `${field} é obrigatório.`;
  return null;
}

function assertPositiveInt(value: unknown, field: string): string | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) return `${field} deve ser um inteiro > 0.`;
  return null;
}

function onlyDigits(value: string) {
  return value.replace(/\D+/g, "");
}

function assertCpf(value: unknown): string | null {
  if (typeof value !== "string") return "CPF é obrigatório para PIX.";
  const digits = onlyDigits(value);
  if (digits.length !== 11) return "CPF deve ter 11 dígitos.";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Método não permitido" }, { status: 405 });

  try {
    const body = (await req.json()) as CreatePixRequest;

    const errBooking = assertNonEmptyString(body?.bookingId, "bookingId");
    if (errBooking) return badRequest(errBooking);

    const errAmount = assertPositiveInt(body?.amountCents, "amountCents");
    if (errAmount) return badRequest(errAmount);

    const errName = assertNonEmptyString(body?.guest?.name, "guest.name");
    if (errName) return badRequest(errName);
    const errEmail = assertNonEmptyString(body?.guest?.email, "guest.email");
    if (errEmail) return badRequest(errEmail);
    const errPhone = assertNonEmptyString(body?.guest?.phone, "guest.phone");
    if (errPhone) return badRequest(errPhone);

    const errCpf = assertCpf(body?.guest?.cpf);
    if (errCpf) return badRequest(errCpf);

    if (!Array.isArray(body?.items) || body.items.length === 0) {
      return badRequest("items é obrigatório.");
    }
    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];
      const eTitle = assertNonEmptyString(item?.title, `items[${i}].title`);
      if (eTitle) return badRequest(eTitle);
      const eQty = assertPositiveInt(item?.quantity, `items[${i}].quantity`);
      if (eQty) return badRequest(eQty);
      const ePrice = assertPositiveInt(item?.unitPrice, `items[${i}].unitPrice`);
      if (ePrice) return badRequest(ePrice);
    }

    const publicKey = Deno.env.get("HURAPAYMENTS_PUBLIC_KEY") ?? "";
    const secretKey = Deno.env.get("HURAPAYMENTS_SECRET_KEY") ?? "";
    if (!publicKey || !secretKey) {
      console.error("Missing HuraPayments credentials env vars");
      return json({ ok: false, error: "Credenciais de pagamento não configuradas." }, { status: 500 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing backend credentials env vars");
      return json({ ok: false, error: "Backend não configurado." }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const postbackUrl = `${supabaseUrl}/functions/v1/hurapayments-postback`;

    // Keep payload minimal & flexible (we'll adjust to your exact Hura response/payload when you test)
    const cpfDigits = onlyDigits(body.guest.cpf!);
    const payload = {
      amount: body.amountCents,
      payment_method: "pix",
      postback_url: postbackUrl,
      customer: {
        name: body.guest.name,
        email: body.guest.email,
        phone: body.guest.phone,
        document: { type: "cpf", number: cpfDigits },
      },
      items: (body.items ?? []).map((i) => ({
        title: i.title,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      metadata: {
        booking_id: body.bookingId,
        ...(body.metadata ?? {}),
      },
      ip: req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? undefined,
    };

    const authHeader = "Basic " + btoa(`${publicKey}:${secretKey}`);

    console.log("Creating PIX transaction", {
      bookingId: body.bookingId,
      amountCents: body.amountCents,
    });

    const huraRes = await fetch("https://api.hurapayments.com.br/v1/payment-transaction/create", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });

    const rawText = await huraRes.text();
    let rawJson: unknown = null;
    try {
      rawJson = rawText ? JSON.parse(rawText) : null;
    } catch {
      rawJson = { raw: rawText };
    }

    if (!huraRes.ok) {
      console.error("Hura create transaction failed", { status: huraRes.status, rawJson });

      // Persist failure for later diagnosis + mark booking as payment_failed
      await supabase
        .from("payment_transactions")
        .insert({
          booking_id: body.bookingId,
          provider: "hurapayments",
          provider_transaction_id: null,
          amount_cents: body.amountCents,
          status: "failed",
          raw: (rawJson ?? {}) as never,
        });

      await supabase
        .from("bookings")
        .update({ payment_status: "payment_failed" })
        .eq("id", body.bookingId);

      return json(
        { ok: false, error: "Falha ao criar transação.", details: rawJson },
        { status: 502 },
      );
    }

    // Heuristic extraction: adapt later with real payload
    const anyJson = rawJson as Record<string, unknown> | null;
    const providerTransactionId =
      (anyJson?.["id"] as string | undefined) ??
      (anyJson?.["transaction_id"] as string | undefined) ??
      (anyJson?.["transactionId"] as string | undefined) ??
      undefined;
    const status = (anyJson?.["status"] as string | undefined) ?? "created";
    const pix = (anyJson?.["pix"] as Record<string, unknown> | undefined) ?? undefined;
    const pixQrCode = (pix?.["qr_code"] as string | undefined) ?? (pix?.["qrCode"] as string | undefined) ?? undefined;
    const pixCopyPaste =
      (pix?.["copy_paste"] as string | undefined) ??
      (pix?.["copyPaste"] as string | undefined) ??
      (pix?.["emv"] as string | undefined) ??
      undefined;

    // Persist server-side (RLS blocks public access; service role bypasses)
    const { error: upsertErr } = await supabase
      .from("payment_transactions")
      .insert({
        booking_id: body.bookingId,
        provider: "hurapayments",
        provider_transaction_id: providerTransactionId ?? null,
        amount_cents: body.amountCents,
        status,
        pix_qr_code: pixQrCode ?? null,
        pix_copy_paste: pixCopyPaste ?? null,
        raw: (rawJson ?? {}) as never,
      });

    if (upsertErr) {
      console.error("Failed to save payment_transactions", upsertErr);
      // still return PIX so user can pay
    }

    return json({
      ok: true,
      provider: "hurapayments",
      providerTransactionId: providerTransactionId ?? null,
      status,
      pix: {
        qrCode: pixQrCode ?? null,
        copyPaste: pixCopyPaste ?? null,
      },
      raw: rawJson,
    });
  } catch (e) {
    console.error("Unexpected error", e);
    return json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
});
