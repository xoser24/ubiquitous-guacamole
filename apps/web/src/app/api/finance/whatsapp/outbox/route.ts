import { NextResponse } from "next/server";
import { assertSameOrigin, jsonError, rateLimit, requireRole, requireUserAny } from "@/lib/api-guard";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { profil } = await requireUserAny(req);
    requireRole(profil.rol, ["admin"]);
    await rateLimit(req, "finance.whatsapp.outbox", 30, 60);

    const sb = await supabaseServer();
    const { data, error } = await sb
      .from("whatsapp_outbox")
      .select("id, tur, to_phone, status, text_body, created_at, error")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) return NextResponse.json({ hata: error.message ?? "Okunamadı." }, { status: 400 });

    return NextResponse.json({ ok: true, rows: data ?? [] }, { status: 200 });
  } catch (e) {
    return jsonError(e);
  }
}

