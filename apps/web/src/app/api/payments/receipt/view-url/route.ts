import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, jsonError, parseJson, rateLimit, requireUserAny } from "@/lib/api-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { FINANCE_RECEIPTS_BUCKET } from "@/lib/finance-receipts";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, profil } = await requireUserAny(req);
    await rateLimit(req, "payments.receipt.view_url", 60, 60);

    const schema = z.object({
      submissionId: z.string().uuid()
    });
    const body = await parseJson(req, schema);

    const admin = supabaseAdmin();
    const { data: sub } = await admin
      .from("payment_submissions")
      .select("id, receipt_path, payer_user_id, student_payments(student_id, students(parent_id, student_user_id))")
      .eq("id", body.submissionId)
      .maybeSingle();
    if (!sub) return NextResponse.json({ hata: "Kayıt bulunamadı." }, { status: 404 });

    const spStudents = (sub as any).student_payments?.students;
    const parentId = spStudents?.parent_id as string | null | undefined;
    const studentUserId = spStudents?.student_user_id as string | null | undefined;

    const isAdmin = profil.rol === "admin";
    const isOwner =
      sub.payer_user_id === user.id ||
      (profil.rol === "veli" && parentId === user.id) ||
      (profil.rol === "ogrenci" && studentUserId === user.id);
    if (!isAdmin && !isOwner) return NextResponse.json({ hata: "Yetkisiz." }, { status: 403 });

    const { data, error } = await admin.storage.from(FINANCE_RECEIPTS_BUCKET).createSignedUrl(sub.receipt_path, 60 * 30); // 30 dk
    if (error || !data) return NextResponse.json({ hata: "Link oluşturulamadı." }, { status: 400 });

    return NextResponse.json({ ok: true, signedUrl: data.signedUrl }, { status: 200 });
  } catch (e) {
    return jsonError(e);
  }
}

