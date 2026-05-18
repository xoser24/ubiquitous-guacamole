import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, jsonError, parseJson, rateLimit, requireRole, requireUserAny } from "@/lib/api-guard";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, profil } = await requireUserAny(req);
    requireRole(profil.rol, ["admin"]);
    await rateLimit(req, "finance.student_payments.update_collection", 120, 60);

    const schema = z.object({
      id: z.string().uuid(),
      tutar_odenen: z.number().min(0)
    });
    const body = await parseJson(req, schema);

    const sb = await supabaseServer();

    const { data: sp, error: e1 } = await sb
      .from("student_payments")
      .select("tutar_toplam, son_odeme_tarihi")
      .eq("id", body.id)
      .maybeSingle();
    if (e1) return NextResponse.json({ hata: e1.message ?? "Kayıt okunamadı." }, { status: 400 });
    if (!sp) return NextResponse.json({ hata: "Kayıt bulunamadı." }, { status: 404 });

    const total = Number((sp as any).tutar_toplam ?? 0);
    const son = String((sp as any).son_odeme_tarihi ?? "");
    const today = new Date().toISOString().slice(0, 10);
    const paid = body.tutar_odenen;
    const durum = paid >= total ? "ödendi" : paid > 0 ? "kısmi" : son < today ? "gecikmiş" : "ödenmedi";

    const { error } = await sb
      .from("student_payments")
      .update({ tutar_odenen: body.tutar_odenen, durum, created_by: user.id })
      .eq("id", body.id);
    if (error) return NextResponse.json({ hata: error.message ?? "Güncellenemedi." }, { status: 400 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return jsonError(e);
  }
}

