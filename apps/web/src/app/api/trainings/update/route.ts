import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, jsonError, parseJson, rateLimit, requireRole, requireUserAny } from "@/lib/api-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, profil } = await requireUserAny(req);
    requireRole(profil.rol, ["admin", "antrenor"]);
    await rateLimit(req, "trainings.update", 60, 60);

    const schema = z.object({
      id: z.string().uuid(),
      baslik: z.string().min(2).max(80),
      tarih: z.string().min(8),
      saat: z.string().min(4),
      konum: z.string().min(2).max(120),
      studentIds: z.array(z.string().uuid()).min(1).max(50)
    });
    const body = await parseJson(req, schema);

    const admin = supabaseAdmin();
    const { data: oturum } = await admin
      .from("training_sessions")
      .select("id, coach_id, iptal")
      .eq("id", body.id)
      .maybeSingle();
    if (!oturum) return NextResponse.json({ hata: "Antrenman bulunamadı." }, { status: 404 });
    if ((oturum as any).iptal) return NextResponse.json({ hata: "Bu oturum iptal edilmiş." }, { status: 400 });

    const canEdit = profil.rol === "admin" || (oturum as any).coach_id === user.id;
    if (!canEdit) return NextResponse.json({ hata: "Yetkisiz." }, { status: 403 });

    const { error } = await admin
      .from("training_sessions")
      .update({ baslik: body.baslik, tarih: body.tarih, saat: body.saat, konum: body.konum })
      .eq("id", body.id);
    if (error) return NextResponse.json({ hata: error.message ?? "Güncellenemedi." }, { status: 400 });

    // Öğrenci atamalarını yeniden yaz
    await admin.from("training_session_students").delete().eq("training_session_id", body.id);
    const rows = body.studentIds.map((sid) => ({ training_session_id: body.id, student_id: sid }));
    const { error: err2 } = await admin.from("training_session_students").insert(rows);
    if (err2) return NextResponse.json({ hata: err2.message ?? "Oyuncular atanamadı." }, { status: 400 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return jsonError(e);
  }
}

