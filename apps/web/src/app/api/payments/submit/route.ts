import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, jsonError, parseJson, rateLimit, requireUserAny } from "@/lib/api-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, profil } = await requireUserAny(req);
    await rateLimit(req, "payments.submit", 30, 60);

    const schema = z.object({
      studentPaymentId: z.string().uuid(),
      amount: z.number().positive(),
      paidAt: z.string().min(8), // YYYY-MM-DD
      receiptPath: z.string().min(5),
      note: z.string().max(500).optional().nullable(),
      receiptMime: z.string().optional().nullable(),
      receiptSize: z.number().int().optional().nullable()
    });
    const body = await parseJson(req, schema);

    const admin = supabaseAdmin();

    const { data: sp } = await admin
      .from("student_payments")
      .select("id, student_id, tutar_toplam, tutar_odenen, students(parent_id, student_user_id)")
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

    const kalan = Math.max(0, Number(sp.tutar_toplam) - Number(sp.tutar_odenen ?? 0));
    if (body.amount > kalan + 0.01) {
      return NextResponse.json({ hata: "Gönderilen tutar kalan borçtan fazla olamaz." }, { status: 400 });
    }

    const { data: sub, error } = await admin
      .from("payment_submissions")
      .insert({
        student_payment_id: sp.id,
        payer_user_id: user.id,
        amount: body.amount,
        paid_at: body.paidAt,
        receipt_path: body.receiptPath,
        receipt_mime: body.receiptMime ?? null,
        receipt_size: body.receiptSize ?? null,
        note: body.note ?? null
      })
      .select("id")
      .single();
    if (error || !sub) return NextResponse.json({ hata: error?.message ?? "Ödeme bildirimi oluşturulamadı." }, { status: 400 });

    return NextResponse.json({ ok: true, id: sub.id }, { status: 200 });
  } catch (e) {
    return jsonError(e);
  }
}

