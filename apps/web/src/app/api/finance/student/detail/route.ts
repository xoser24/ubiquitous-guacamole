import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, jsonError, parseJson, rateLimit, requireRole, requireUserAny } from "@/lib/api-guard";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { profil } = await requireUserAny(req);
    requireRole(profil.rol, ["admin"]);
    await rateLimit(req, "finance.student.detail", 120, 60);

    const schema = z.object({
      studentId: z.string().uuid(),
      limit: z.number().int().min(10).max(500).optional().default(200)
    });
    const body = await parseJson(req, schema);

    const sb = await supabaseServer();

    // Öğrenci (finans odaklı alanlar)
    const studentReq = await sb
      .from("students")
      .select("id, ad_soyad, yas_grubu, veli_adi, veli_telefon, aidat_vade_gunu, aylik_aidat_tutar")
      .eq("id", body.studentId)
      .maybeSingle();
    const studentFallback =
      studentReq.error && /aidat_vade_gunu|aylik_aidat_tutar/i.test(studentReq.error.message ?? "")
        ? await sb.from("students").select("id, ad_soyad, yas_grubu, veli_adi, veli_telefon").eq("id", body.studentId).maybeSingle()
        : null;
    const student = studentFallback?.data ?? studentReq.data ?? null;
    if (!student) return NextResponse.json({ hata: "Öğrenci bulunamadı." }, { status: 404 });

    // Ödeme kalemleri
    const { data: payments } = await sb
      .from("student_payments")
      .select("id, donem, gelir_kategorisi, tutar_toplam, tutar_odenen, son_odeme_tarihi, durum, created_at")
      .eq("student_id", body.studentId)
      .eq("iptal", false)
      .order("son_odeme_tarihi", { ascending: false })
      .limit(body.limit);

    // Defter hareketleri (student_id kolonu yoksa boş döner)
    let tx: any[] = [];
    try {
      const res = await sb
        .from("financial_transactions")
        .select("id, tur, kategori, tutar, tarih, aciklama, student_id, created_at")
        .eq("iptal", false)
        .eq("student_id", body.studentId)
        .order("tarih", { ascending: false })
        .limit(body.limit);
      if (!res.error) tx = (res.data as any[]) ?? [];
    } catch {
      tx = [];
    }

    return NextResponse.json({ student, payments: payments ?? [], transactions: tx }, { status: 200 });
  } catch (e) {
    return jsonError(e);
  }
}

