// ============================================================
//  Supabase Edge Function: payhere-notify
//  Handles PayHere payment notifications (webhooks)
//  PayHere calls this URL after every payment attempt
//
//  Deploy: supabase functions deploy payhere-notify
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function md5PureJS(str: string): string {
  function safeAdd(x: number, y: number) { const lsw=(x&0xFFFF)+(y&0xFFFF);const msw=(x>>16)+(y>>16)+(lsw>>16);return(msw<<16)|(lsw&0xFFFF); }
  function bitRotateLeft(num: number,cnt: number){return(num<<cnt)|(num>>>(32-cnt))}
  function md5cmn(q:number,a:number,b:number,x:number,s:number,t:number){return safeAdd(bitRotateLeft(safeAdd(safeAdd(a,q),safeAdd(x,t)),s),b)}
  function md5ff(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return md5cmn((b&c)|((~b)&d),a,b,x,s,t)}
  function md5gg(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return md5cmn((b&d)|(c&(~d)),a,b,x,s,t)}
  function md5hh(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return md5cmn(b^c^d,a,b,x,s,t)}
  function md5ii(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return md5cmn(c^(b|(~d)),a,b,x,s,t)}
  function str2binl(str:string){const bin:number[]=[],mask=(1<<8)-1;for(let i=0;i<str.length*8;i+=8)bin[i>>5]|=(str.charCodeAt(i/8)&mask)<<(i%32);return bin}
  function binl2hex(binarray:number[]){const hexTab="0123456789abcdef";let str="";for(let i=0;i<binarray.length*4;i++)str+=hexTab.charAt((binarray[i>>2]>>((i%4)*8+4))&0xF)+hexTab.charAt((binarray[i>>2]>>((i%4)*8))&0xF);return str}
  function binlMD5(x:number[],len:number){x[len>>5]|=0x80<<(len%32);x[(((len+64)>>>9)<<4)+14]=len;let a=1732584193,b=-271733879,c=-1732584194,d=271733878;for(let i=0;i<x.length;i+=16){const oa=a,ob=b,oc=c,od=d;a=md5ff(a,b,c,d,x[i],7,-680876936);d=md5ff(d,a,b,c,x[i+1],12,-389564586);c=md5ff(c,d,a,b,x[i+2],17,606105819);b=md5ff(b,c,d,a,x[i+3],22,-1044525330);a=md5ff(a,b,c,d,x[i+4],7,-176418897);d=md5ff(d,a,b,c,x[i+5],12,1200080426);c=md5ff(c,d,a,b,x[i+6],17,-1473231341);b=md5ff(b,c,d,a,x[i+7],22,-45705983);a=md5ff(a,b,c,d,x[i+8],7,1770035416);d=md5ff(d,a,b,c,x[i+9],12,-1958414417);c=md5ff(c,d,a,b,x[i+10],17,-42063);b=md5ff(b,c,d,a,x[i+11],22,-1990404162);a=md5ff(a,b,c,d,x[i+12],7,1804603682);d=md5ff(d,a,b,c,x[i+13],12,-40341101);c=md5ff(c,d,a,b,x[i+14],17,-1502002290);b=md5ff(b,c,d,a,x[i+15],22,1236535329);a=md5gg(a,b,c,d,x[i+1],5,-165796510);d=md5gg(d,a,b,c,x[i+6],9,-1069501632);c=md5gg(c,d,a,b,x[i+11],14,643717713);b=md5gg(b,c,d,a,x[i],20,-373897302);a=md5gg(a,b,c,d,x[i+5],5,-701558691);d=md5gg(d,a,b,c,x[i+10],9,38016083);c=md5gg(c,d,a,b,x[i+15],14,-660478335);b=md5gg(b,c,d,a,x[i+4],20,-405537848);a=md5gg(a,b,c,d,x[i+9],5,568446438);d=md5gg(d,a,b,c,x[i+14],9,-1019803690);c=md5gg(c,d,a,b,x[i+3],14,-187363961);b=md5gg(b,c,d,a,x[i+8],20,1163531501);a=md5gg(a,b,c,d,x[i+13],5,-1444681467);d=md5gg(d,a,b,c,x[i+2],9,-51403784);c=md5gg(c,d,a,b,x[i+7],14,1735328473);b=md5gg(b,c,d,a,x[i+12],20,-1926607734);a=md5hh(a,b,c,d,x[i+5],4,-378558);d=md5hh(d,a,b,c,x[i+8],11,-2022574463);c=md5hh(c,d,a,b,x[i+11],16,1839030562);b=md5hh(b,c,d,a,x[i+14],23,-35309556);a=md5hh(a,b,c,d,x[i+1],4,-1530992060);d=md5hh(d,a,b,c,x[i+4],11,1272893353);c=md5hh(c,d,a,b,x[i+7],16,-155497632);b=md5hh(b,c,d,a,x[i+10],23,-1094730640);a=md5hh(a,b,c,d,x[i+13],4,681279174);d=md5hh(d,a,b,c,x[i],11,-358537222);c=md5hh(c,d,a,b,x[i+3],16,-722521979);b=md5hh(b,c,d,a,x[i+6],23,76029189);a=md5hh(a,b,c,d,x[i+9],4,-640364487);d=md5hh(d,a,b,c,x[i+12],11,-421815835);c=md5hh(c,d,a,b,x[i+15],16,530742520);b=md5hh(b,c,d,a,x[i+2],23,-995338651);a=md5ii(a,b,c,d,x[i],6,-198630844);d=md5ii(d,a,b,c,x[i+7],10,1126891415);c=md5ii(c,d,a,b,x[i+14],15,-1416354905);b=md5ii(b,c,d,a,x[i+5],21,-57434055);a=md5ii(a,b,c,d,x[i+12],6,1700485571);d=md5ii(d,a,b,c,x[i+3],10,-1894986606);c=md5ii(c,d,a,b,x[i+10],15,-1051523);b=md5ii(b,c,d,a,x[i+1],21,-2054922799);a=md5ii(a,b,c,d,x[i+8],6,1873313359);d=md5ii(d,a,b,c,x[i+15],10,-30611744);c=md5ii(c,d,a,b,x[i+6],15,-1560198380);b=md5ii(b,c,d,a,x[i+13],21,1309151649);a=md5ii(a,b,c,d,x[i+4],6,-145523070);d=md5ii(d,a,b,c,x[i+11],10,-1120210379);c=md5ii(c,d,a,b,x[i+2],15,718787259);b=md5ii(b,c,d,a,x[i+9],21,-343485551);a=safeAdd(a,oa);b=safeAdd(b,ob);c=safeAdd(c,oc);d=safeAdd(d,od);}return[a,b,c,d]}
  return binl2hex(binlMD5(str2binl(str), str.length * 8));
}

serve(async (req) => {
  const corsHeaders = { "Access-Control-Allow-Origin": "*" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl    = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const merchantSecret = Deno.env.get("PAYHERE_MERCHANT_SECRET")!;
    const merchantId     = Deno.env.get("PAYHERE_MERCHANT_ID")!;

    // Use service role for webhook (no user JWT available)
    const sb = createClient(supabaseUrl, serviceRoleKey);

    // Parse form body from PayHere
    const body        = await req.formData();
    const merchantIdPH= body.get("merchant_id") as string;
    const orderId     = body.get("order_id") as string;
    const paymentId   = body.get("payment_id") as string;
    const payhereAmount = body.get("payhere_amount") as string;
    const payhereCurrency = body.get("payhere_currency") as string;
    const statusCode  = body.get("status_code") as string;
    const md5sig      = body.get("md5sig") as string;

    // Verify hash
    const localSecretHash = md5PureJS(merchantSecret).toUpperCase();
    const expectedSig     = md5PureJS(
      `${merchantIdPH}${orderId}${payhereAmount}${payhereCurrency}${statusCode}${localSecretHash}`
    ).toUpperCase();

    if (md5sig !== expectedSig) {
      console.error("PayHere hash mismatch. Possible fraud attempt.");
      return new Response("Hash mismatch", { status: 400 });
    }

    // statusCode 2 = Payment success
    if (statusCode !== "2") {
      console.log(`Non-success status for order ${orderId}: ${statusCode}`);
      return new Response("OK", { status: 200 });
    }

    // Parse order ID: COURSE-{courseId}-{userId}-{timestamp} or TICKET-{liveClassId}-{userId}-{timestamp}
    const parts = orderId.split("-");
    const type  = parts[0]; // 'COURSE' or 'TICKET'
    const refId = parts[1]; // courseId or liveClassId
    const userId= parts[2]; // userId (UUID has hyphens so we need to reconstruct)
    // UUID is parts[2] through parts[6] (5 parts separated by -)
    const userIdFull = parts.slice(2, 7).join("-");

    if (type === "COURSE") {
      // Create enrollment
      const { error } = await sb.from("enrollments").upsert({
        user_id: userIdFull,
        course_id: refId,
        status: "active",
        amount_paid: parseFloat(payhereAmount),
        progress_percent: 0,
      });
      if (error) console.error("Enrollment error:", error);

      // Send notification
      await sb.from("notifications").insert({
        user_id: userIdFull,
        type: "enrollment_confirmed",
        message: "Your course enrollment is confirmed! Start learning now.",
        data: { course_id: refId, order_id: orderId },
      });

    } else if (type === "TICKET") {
      // Create live class ticket (30-day access)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { error } = await sb.from("live_class_tickets").upsert({
        user_id: userIdFull,
        live_class_id: refId,
        status: "active",
        expires_at: expiresAt.toISOString(),
        amount_paid: parseFloat(payhereAmount),
      });
      if (error) console.error("Ticket error:", error);

      // Send notification
      await sb.from("notifications").insert({
        user_id: userIdFull,
        type: "ticket_activated",
        message: "Your live class ticket is active! Check your dashboard for the class link.",
        data: { live_class_id: refId, order_id: orderId },
      });
    }

    // Update payment record
    await sb.from("payments").update({
      status: "completed",
      payment_method: body.get("method") as string || "payhere",
    }).eq("user_id", userIdFull).ilike("reference_id", refId);

    console.log(`✅ Payment processed: ${orderId}`);
    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Internal error", { status: 500 });
  }
});
