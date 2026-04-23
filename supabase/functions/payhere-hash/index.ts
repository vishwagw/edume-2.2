// Edume Learning — PayHere Hash Generator Edge Function
// Deploy: supabase functions deploy payhere-hash
// Secrets: supabase secrets set PAYHERE_MERCHANT_ID=xxx PAYHERE_MERCHANT_SECRET=xxx

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { order_id, amount, currency = "LKR" } = await req.json();
    const MID    = Deno.env.get("PAYHERE_MERCHANT_ID");
    const SECRET = Deno.env.get("PAYHERE_MERCHANT_SECRET");
    if (!MID || !SECRET) throw new Error("PayHere env vars missing");

    const { createHash } = await import("https://deno.land/std@0.168.0/hash/mod.ts");
    const secretHash = createHash("md5").update(SECRET).toString("hex").toUpperCase();
    const hash = createHash("md5").update(`${MID}${order_id}${amount}${currency}${secretHash}`).toString("hex").toUpperCase();

    return new Response(JSON.stringify({ hash, merchant_id: MID }), {
      headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});
