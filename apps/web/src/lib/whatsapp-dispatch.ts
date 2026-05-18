import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendWhatsAppText } from "@/lib/whatsapp";

export async function dispatchWhatsAppOutbox(limit = 25) {
  const sb = supabaseAdmin();

  const { data: rows, error } = await sb
    .from("whatsapp_outbox")
    .select("id, to_phone, message_type, text_body, attempt_count")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  let sent = 0;
  let failed = 0;

  for (const r of rows ?? []) {
    try {
      if (r.message_type !== "text") {
        throw new Error("Şu an sadece text mesaj destekleniyor.");
      }
      if (!r.text_body) throw new Error("text_body boş.");

      await sendWhatsAppText({ to: r.to_phone, body: r.text_body });

      await sb
        .from("whatsapp_outbox")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          last_attempt_at: new Date().toISOString(),
          attempt_count: (r.attempt_count ?? 0) + 1,
          error: null
        })
        .eq("id", r.id);

      sent++;
    } catch (e: any) {
      await sb
        .from("whatsapp_outbox")
        .update({
          status: "failed",
          last_attempt_at: new Date().toISOString(),
          attempt_count: (r.attempt_count ?? 0) + 1,
          error: String(e?.message ?? e)
        })
        .eq("id", r.id);

      failed++;
    }
  }

  return { scanned: rows?.length ?? 0, sent, failed };
}

