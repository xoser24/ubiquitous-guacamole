import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, jsonError, parseJson, rateLimit, requireRole, requireUserAny } from "@/lib/api-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, profil } = await requireUserAny(req);
    requireRole(profil.rol, ["admin", "antrenor"]);
    await rateLimit(req, "trainings.create", 30, 60);

    const schema = z.object({
      baslik: z.string().min(2).max(80),
      tarih: z.string().min(8), // YYYY-MM-DD
      saat: z.string().min(4), // HH:mm
      konum: z.string().min(2).max(120),
      studentIds: z.array(z.string().uuid()).min(1).max(50),
      coachId: z.string().uuid().optional()
    });
    const body = await parseJson(req, schema);

    const admin = supabaseAdmin();

    const coachId = profil.rol === "admin" ? body.coachId : user.id;
    if (!coachId) return NextResponse.json({ hata: "Antrenör seçilmelidir." }, { status: 400 });

    // FK bağımlılığı (training_sessions.coach_id -> coaches.id)
    const { error: coachErr } = await admin.from("coaches").upsert({ id: coachId }, { onConflict: "id" });
    if (coachErr) return NextResponse.json({ hata: coachErr.message ?? "Koç kaydı oluşturulamadı." }, { status: 400 });

    const { data: oturum, error } = await admin
      .from("training_sessions")
      .insert({ coach_id: coachId, baslik: body.baslik, tarih: body.tarih, saat: body.saat, konum: body.konum })
      .select("id")
      .single();
    if (error || !oturum) return NextResponse.json({ hata: error?.message ?? "Antrenman oluşturulamadı." }, { status: 400 });

    const rows = body.studentIds.map((sid) => ({ training_session_id: oturum.id, student_id: sid }));
    const { error: err2 } = await admin.from("training_session_students").insert(rows);
    if (err2) return NextResponse.json({ hata: err2.message ?? "Oyuncular atanamadı." }, { status: 400 });

    return NextResponse.json({ ok: true, id: oturum.id }, { status: 200 });
  } catch (e) {
    return jsonError(e);
  }
}
