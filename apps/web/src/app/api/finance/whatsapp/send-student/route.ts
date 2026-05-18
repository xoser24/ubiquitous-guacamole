import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, jsonError, parseJson, rateLimit, requireRole, requireUserAny } from "@/lib/api-guard";
import { supabaseServer } from "@/lib/supabase/server";

// Admin: tek öğrenciye WhatsApp tahsilat mesajı kuyruğa atar (outbox).
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { profil } = await requireUserAny(req);
    requireRole(profil.rol, ["admin"]);
    await rateLimit(req, "finance.whatsapp.send_student", 60, 60);

    const schema = z.object({
      studentId: z.string().uuid(),
      text: z.string().min(5).max(700),
      dedupeKey: z.string().min(6).max(160),
      related: z.record(z.any()).optional()
    });
    const body = await parseJson(req, schema);

    const sb = await supabaseServer();
    const { error } = await sb.rpc("enqueue_whatsapp_to_student", {
      p_student_id: body.studentId,
      p_tur: "odeme_hatirlatma",
      p_text: body.text,
      p_dedupe_prefix: body.dedupeKey,
      p_related: body.related ?? {}
    });
    if (error) return NextResponse.json({ hata: error.message ?? "Kuyruğa eklenemedi." }, { status: 400 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return jsonError(e);
  }
}

