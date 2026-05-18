import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, jsonError, parseJson, rateLimit, requireRole, requireUserAny } from "@/lib/api-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, profil } = await requireUserAny(req);
    requireRole(profil.rol, ["admin"]);
    await rateLimit(req, "finance.student_payments.update", 60, 60);

    const schema = z.object({
      id: z.string().uuid(),
      donem: z.string().min(4).max(12),
      gelir_kategorisi: z.string().min(2).max(80),
      tutar_toplam: z.number().positive(),
      tutar_odenen: z.number().min(0),
      son_odeme_tarihi: z.string().min(8)
    });
    const body = await parseJson(req, schema);

    const today = new Date().toISOString().slice(0, 10);
    const durum =
      body.tutar_odenen >= body.tutar_toplam
        ? "ödendi"
        : body.tutar_odenen > 0
          ? "kısmi"
          : body.son_odeme_tarihi < today
            ? "gecikmiş"
            : "ödenmedi";

    const admin = supabaseAdmin();
    const { error } = await admin
      .from("student_payments")
      .update({
        donem: body.donem,
        gelir_kategorisi: body.gelir_kategorisi,
        tutar_toplam: body.tutar_toplam,
        tutar_odenen: body.tutar_odenen,
        son_odeme_tarihi: body.son_odeme_tarihi,
        durum,
        created_by: user.id
      })
      .eq("id", body.id)
      .eq("iptal", false);
    if (error) return NextResponse.json({ hata: error.message ?? "Güncellenemedi." }, { status: 400 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return jsonError(e);
  }
}

