import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { assertSameOrigin, jsonError, parseJson, rateLimit, requireUserAny } from "@/lib/api-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { FINANCE_RECEIPTS_BUCKET, receiptExt, validateReceipt } from "@/lib/finance-receipts";

// Veli/öğrenci dekont yükleme URL'i alır (admin onaylı akış).
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, profil } = await requireUserAny(req);
    await rateLimit(req, "payments.receipt.upload_url", 20, 60);

    const schema = z.object({
      studentPaymentId: z.string().uuid(),
      mime: z.string().min(3),
      size: z.number().int()
    });
    const body = await parseJson(req, schema);

    const v = validateReceipt(body.mime, body.size);
    if (!v.ok) return NextResponse.json({ hata: v.error }, { status: 400 });

    const admin = supabaseAdmin();

    // Yetki: admin her şeyi, veli/ogrenci kendi öğrencisi için
    const { data: sp } = await admin
      .from("student_payments")
      .select("id, student_id, donem, gelir_kategorisi, students(parent_id, student_user_id)")
      .eq("id", body.studentPaymentId)
      .maybeSingle();
    if (!sp) return NextResponse.json({ hata: "Borç kaydı bulunamadı." }, { status: 404 });

    const parentId = (sp as any).students?.parent_id as string | null | undefined;
    const studentUserId = (sp as any).students?.student_user_id as string | null | undefined;

    const isAdmin = profil.rol === "admin";
    const isOwner =
      (profil.rol === "veli" && parentId === user.id) ||
      (profil.rol === "ogrenci" && studentUserId === user.id);
    if (!isAdmin && !isOwner) return NextResponse.json({ hata: "Yetkisiz." }, { status: 403 });

    const ext = receiptExt(body.mime);
    const objectPath = `student_payments/${sp.id}/${profil.id}/${crypto.randomUUID()}.${ext}`;

    const { data, error } = await admin.storage.from(FINANCE_RECEIPTS_BUCKET).createSignedUploadUrl(objectPath);
    if (error || !data) return NextResponse.json({ hata: "Upload URL oluşturulamadı." }, { status: 400 });

    return NextResponse.json(
      {
        ok: true,
        bucket: FINANCE_RECEIPTS_BUCKET,
        path: objectPath,
        uploadUrl: data.signedUrl,
        token: (data as any).token ?? null
      },
      { status: 200 }
    );
  } catch (e) {
    return jsonError(e);
  }
}

