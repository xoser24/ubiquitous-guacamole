import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, jsonError, parseJson, rateLimit, requireRole, requireUserAny } from "@/lib/api-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, profil } = await requireUserAny(req);
    requireRole(profil.rol, ["admin"]);
    await rateLimit(req, "finance.ledger.update", 60, 60);

    const schema = z.object({
      id: z.string().uuid(),
      tur: z.enum(["gelir", "gider"]),
      kategori: z.string().min(2).max(80),
      tutar: z.number().positive(),
      tarih: z.string().min(8),
      aciklama: z.string().max(300).optional().nullable(),
      student_id: z.string().uuid().optional().nullable()
    });
    const body = await parseJson(req, schema);

    const admin = supabaseAdmin();
    const patch: any = {
      tur: body.tur,
      kategori: body.kategori,
      tutar: body.tutar,
      tarih: body.tarih,
      aciklama: body.aciklama ?? null,
      student_id: body.student_id ?? null,
      created_by: user.id
    };

    let { error } = await admin
      .from("financial_transactions")
      .update(patch)
      .eq("id", body.id)
      .eq("iptal", false);
    // Eski DB şemasında student_id yoksa, student_id olmadan tekrar dene.
    if (error && /student_id/i.test(error.message ?? "")) {
      const { student_id, ...fallback } = patch;
      ({ error } = await admin.from("financial_transactions").update(fallback).eq("id", body.id).eq("iptal", false));
    }
    if (error) return NextResponse.json({ hata: error.message ?? "Güncellenemedi." }, { status: 400 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return jsonError(e);
  }
}
