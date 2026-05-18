import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, jsonError, parseJson, rateLimit, requireRole, requireUserAny } from "@/lib/api-guard";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, profil } = await requireUserAny(req);
    requireRole(profil.rol, ["admin"]);
    await rateLimit(req, "finance.student_payments.create", 60, 60);

    const schema = z.object({
      student_id: z.string().uuid(),
      donem: z.string().min(4).max(12),
      gelir_kategorisi: z.string().min(2).max(80),
      tutar_toplam: z.number().positive(),
      tutar_odenen: z.number().min(0),
      son_odeme_tarihi: z.string().min(8)
    });
    const body = await parseJson(req, schema);

    const sb = await supabaseServer();

    // Durum hesap (DB tarafında da recompute var ama burada da tutarlılık için)
    const total = body.tutar_toplam;
    const paid = body.tutar_odenen;
    const son = body.son_odeme_tarihi;
    const today = new Date().toISOString().slice(0, 10);
    const durum =
      paid >= total ? "ödendi" : paid > 0 ? "kısmi" : son < today ? "gecikmiş" : "ödenmedi";

    const { error } = await sb.from("student_payments").insert({
      student_id: body.student_id,
      donem: body.donem,
      gelir_kategorisi: body.gelir_kategorisi,
      tutar_toplam: body.tutar_toplam,
      tutar_odenen: body.tutar_odenen,
      son_odeme_tarihi: body.son_odeme_tarihi,
      durum,
      created_by: user.id
    });
    if (error) return NextResponse.json({ hata: error.message ?? "Ödeme kaydı eklenemedi." }, { status: 400 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return jsonError(e);
  }
}

