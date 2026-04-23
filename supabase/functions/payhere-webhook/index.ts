import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const form = await req.formData();
  const status = form.get("status_code");
  const custom1 = (form.get("custom_1") as string)||"";
  const amount  = form.get("payhere_amount");
  const method  = form.get("method");

  if (status !== "2") return new Response("not successful", { status: 200 });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const [userId, refId, type] = custom1.split("|");
  if (!userId || !refId) return new Response("invalid", { status: 400 });

  if (type === "ticket") {
    const exp = new Date(); exp.setDate(exp.getDate() + 30);
    await sb.from("live_class_tickets").insert({ user_id:userId, live_class_id:refId, status:"active", amount_paid:parseFloat(amount as string), expires_at:exp.toISOString() });
    await sb.from("notifications").insert({ user_id:userId, type:"ticket_confirmed", message:"Your live class ticket is now active! Check your dashboard." });
  } else {
    await sb.from("enrollments").upsert({ user_id:userId, course_id:refId, status:"active", amount_paid:parseFloat(amount as string), progress_percent:0 }, { onConflict:"user_id,course_id" });
    await sb.from("payments").update({ status:"completed", payment_method:method as string }).eq("user_id",userId).eq("reference_id",refId).eq("status","pending");
    await sb.from("notifications").insert({ user_id:userId, type:"enrollment_confirmed", message:"Enrollment confirmed! Your course is ready." });
  }
  return new Response("OK", { status: 200 });
});
