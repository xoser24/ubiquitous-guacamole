import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, jsonError, parseJson, rateLimit, requireRole, requireUserAny } from "@/lib/api-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { profil } = await requireUserAny(req);
    requireRole(profil.rol, ["admin"]);
    await rateLimit(req, "finance.students.update", 60, 60);

    const schema = z.object({
      studentId: z.string().uuid(),
      aidat_vade_gunu: z.number().int().min(1).max(28).nullable().optional(),
      aylik_aidat_tutar: z.number().positive().nullable().optional()
    });

    const body = await parseJson(req, schema);
    const admin = supabaseAdmin();

    const patch: any = {};
    if (body.aidat_vade_gunu !== undefined) patch.aidat_vade_gunu = body.aidat_vade_gunu;
    if (body.aylik_aidat_tutar !== undefined) patch.aylik_aidat_tutar = body.aylik_aidat_tutar;

    const { error } = await admin.from("students").update(patch).eq("id", body.studentId);
    if (error) {
      const msg = error.message ?? "Güncellenemedi.";
      if (/aidat_vade_gunu|aylik_aidat_tutar/i.test(msg)) {
        return NextResponse.json(
          {
            hata:
              "Veritabanında aidat ayar kolonları yok. Önce Supabase SQL'de migration çalıştırılmalı (aidat_vade_gunu, aylik_aidat_tutar)."
          },
          { status: 400 }
        );
      }
      return NextResponse.json({ hata: msg }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return jsonError(e);
  }
}
