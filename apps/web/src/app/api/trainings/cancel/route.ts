import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, jsonError, parseJson, rateLimit, requireRole, requireUserAny } from "@/lib/api-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, profil } = await requireUserAny(req);
    requireRole(profil.rol, ["admin", "antrenor"]);
    await rateLimit(req, "trainings.cancel", 60, 60);

    const schema = z.object({
      id: z.string().uuid(),
      neden: z.string().max(300).optional().nullable()
    });
    const body = await parseJson(req, schema);

    const admin = supabaseAdmin();
    const { data: oturum } = await admin
      .from("training_sessions")
      .select("id, coach_id, iptal")
      .eq("id", body.id)
      .maybeSingle();
    if (!oturum) return NextResponse.json({ hata: "Antrenman bulunamadı." }, { status: 404 });
    if ((oturum as any).iptal) return NextResponse.json({ ok: true }, { status: 200 });

    const canEdit = profil.rol === "admin" || (oturum as any).coach_id === user.id;
    if (!canEdit) return NextResponse.json({ hata: "Yetkisiz." }, { status: 403 });

    // FK bağımlılığı: training_sessions.iptal_eden -> coaches.id
    // (antrenör/admin iptal ettiğinde id mevcut değilse update hata veriyor)
    const { error: coachErr } = await admin.from("coaches").upsert({ id: user.id }, { onConflict: "id" });
    if (coachErr) return NextResponse.json({ hata: coachErr.message ?? "Koç kaydı oluşturulamadı." }, { status: 400 });

    const { error } = await admin
      .from("training_sessions")
      .update({
        iptal: true,
        iptal_nedeni: body.neden ?? null,
        iptal_tarihi: new Date().toISOString(),
        iptal_eden: user.id
      })
      .eq("id", body.id)
      .eq("iptal", false);
    if (error) return NextResponse.json({ hata: error.message ?? "İptal edilemedi." }, { status: 400 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return jsonError(e);
  }
}
