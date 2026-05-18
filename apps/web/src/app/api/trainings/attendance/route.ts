import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, jsonError, parseJson, rateLimit, requireRole, requireUserAny } from "@/lib/api-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, profil } = await requireUserAny(req);
    requireRole(profil.rol, ["admin", "antrenor"]);
    await rateLimit(req, "trainings.attendance", 120, 60);

    const schema = z.object({
      trainingSessionId: z.string().uuid(),
      studentId: z.string().uuid(),
      durum: z.enum(["geldi", "gelmedi", "izinli"]),
      notu: z.string().max(500).optional().nullable()
    });
    const body = await parseJson(req, schema);

    const admin = supabaseAdmin();

    if (profil.rol === "antrenor") {
      const { data: ts } = await admin
        .from("training_sessions")
        .select("coach_id")
        .eq("id", body.trainingSessionId)
        .maybeSingle();
      if (!ts || ts.coach_id !== user.id) {
        return NextResponse.json({ hata: "Yetkisiz." }, { status: 403 });
      }
      const { error: coachErr } = await admin.from("coaches").upsert({ id: user.id }, { onConflict: "id" });
      if (coachErr) return NextResponse.json({ hata: coachErr.message ?? "Koç kaydı oluşturulamadı." }, { status: 400 });
    }

    const { error } = await admin.from("attendance").upsert(
      {
        training_session_id: body.trainingSessionId,
        student_id: body.studentId,
        durum: body.durum,
        isaretleyen_coach_id: user.id,
        notu: body.notu ?? null
      },
      { onConflict: "training_session_id,student_id" }
    );
    if (error) return NextResponse.json({ hata: error.message ?? "Yoklama güncellenemedi." }, { status: 400 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return jsonError(e);
  }
}
