import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, jsonError, parseJson, rateLimit, requireRole, requireUserAny } from "@/lib/api-guard";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, profil } = await requireUserAny(req);
    requireRole(profil.rol, ["admin"]);
    await rateLimit(req, "finance.ledger.create", 60, 60);

    const schema = z.object({
      tur: z.enum(["gelir", "gider"]),
      kategori: z.string().min(2).max(80),
      tutar: z.number().positive(),
      tarih: z.string().min(8),
      aciklama: z.string().max(300).optional().nullable()
    });
    const body = await parseJson(req, schema);

    const sb = await supabaseServer();
    const { error } = await sb.from("financial_transactions").insert({
      tur: body.tur,
      kategori: body.kategori,
      tutar: body.tutar,
      tarih: body.tarih,
      aciklama: body.aciklama ?? null,
      created_by: user.id
    });
    if (error) return NextResponse.json({ hata: error.message ?? "Kayıt eklenemedi." }, { status: 400 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return jsonError(e);
  }
}

