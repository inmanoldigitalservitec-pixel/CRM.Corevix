import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function paypalBaseUrl() {
  const env = Deno.env.get("PAYPAL_ENV") || "sandbox";
  return env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

async function getPayPalAccessToken() {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials are not configured.");
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const json = await res.json();

  if (!res.ok) {
    console.error("PayPal token error:", json);
    throw new Error("Could not get PayPal access token.");
  }

  return json.access_token as string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { publicToken, orderID } = await req.json();

    if (!publicToken || !orderID) {
      return new Response(JSON.stringify({ error: "Missing publicToken or orderID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, number, total, currency, status, public_token, company_id, created_by")
      .eq("public_token", publicToken)
      .maybeSingle();

    if (invoiceError) throw invoiceError;

    if (!invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getPayPalAccessToken();

    const captureRes = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
    });

    const capture = await captureRes.json();

    if (!captureRes.ok) {
      console.error("PayPal capture error:", capture);
      throw new Error("Could not capture PayPal order.");
    }

    const captureUnit = capture?.purchase_units?.[0]?.payments?.captures?.[0];
    const captureId = captureUnit?.id || null;
    const payerEmail = capture?.payer?.email_address || null;
    const status = String(capture?.status || "").toUpperCase();

    if (status !== "COMPLETED") {
      return new Response(JSON.stringify({ error: "PayPal payment not completed", capture }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        status: "Paid",
        payment_provider: "paypal",
        paypal_order_id: orderID,
        paypal_capture_id: captureId,
        paypal_payer_email: payerEmail,
        paid_at: new Date().toISOString(),
      })
      .eq("id", invoice.id);

    if (updateError) throw updateError;

    try {
      await supabase.rpc("log_activity_event", {
        p_company_id: invoice.company_id,
        p_user_id: invoice.created_by || null,
        p_action: "invoice_paid",
        p_entity_type: "invoices",
        p_entity_id: invoice.id,
        p_detail: `Factura pagada por PayPal: ${invoice.number}`,
        p_metadata: {
          payment_provider: "paypal",
          order_id: orderID,
          capture_id: captureId,
        },
      });
    } catch (logError) {
      console.warn("invoice_paid activity log skipped:", logError);
    }

    try {
      await supabase.rpc("create_project_from_paid_invoice", {
        p_invoice_id: invoice.id,
      });
    } catch (projectError) {
      console.warn("Project creation skipped or failed:", projectError);
    }

    return new Response(JSON.stringify({ ok: true, capture }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("paypal-capture-order error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unexpected error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
