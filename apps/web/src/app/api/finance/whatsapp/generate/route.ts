import { NextResponse } from "next/server";
import { assertSameOrigin, jsonError, rateLimit, requireRole, requireUserAny } from "@/lib/api-guard";
import { supabaseServer } from "@/lib/supabase/server";

// Admin: DB tarafındaki generator fonksiyonunu çalıştırır (antrenman + ödeme hatırlatmaları kuyruğa eklenir)
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { profil } = await requireUserAny(req);
    requireRole(profil.rol, ["admin"]);
    await rateLimit(req, "finance.whatsapp.generate", 10, 60);

    const sb = await supabaseServer();
    const { error } = await sb.rpc("generate_whatsapp_reminders");
    if (error) return NextResponse.json({ hata: error.message ?? "Hatırlatmalar üretilemedi." }, { status: 400 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return jsonError(e);
  }
}

