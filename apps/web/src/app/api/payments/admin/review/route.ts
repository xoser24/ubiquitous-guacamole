import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, jsonError, parseJson, rateLimit, requireRole, requireUserAny } from "@/lib/api-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

function toDateStr(v: any) {
  if (!v) return new Date().toISOString().slice(0, 10);
  if (typeof v === "string") return v.slice(0, 10);
  try {
    return new Date(v).toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, profil } = await requireUserAny(req);
    requireRole(profil.rol, ["admin"]);
    await rateLimit(req, "payments.admin.review", 60, 60);

    const schema = z.object({
      submissionId: z.string().uuid(),
      action: z.enum(["approve", "reject"]),
      note: z.string().max(500).optional().nullable()
    });
    const body = await parseJson(req, schema);

    const admin = supabaseAdmin();
    const rpcRes = await admin.rpc("review_payment_submission", {
      p_submission_id: body.submissionId,
      p_admin_id: user.id,
      p_action: body.action,
      p_note: body.note ?? null
    });
    if (!rpcRes.error) return NextResponse.json({ ok: true }, { status: 200 });

    // Bazı ortamlarda DB fonksiyonu / şema farklı olabiliyor (örn: financial_transactions.para_birimi yok).
    // Bu durumda uygulama tarafında fallback akışı uyguluyoruz.
    const msg = rpcRes.error.message ?? "İşlem başarısız.";
    const shouldFallback =
      /para_birimi/i.test(msg) ||
      /payment_submission_status/i.test(msg) ||
      /review_payment_submission/i.test(msg);
    if (!shouldFallback) return NextResponse.json({ hata: msg }, { status: 400 });

    const { data: sub, error: subErr } = await admin
      .from("payment_submissions")
      .select("id,status,amount,paid_at,student_payment_id")
      .eq("id", body.submissionId)
      .maybeSingle();
    if (subErr) return NextResponse.json({ hata: subErr.message ?? "Submission okunamadı." }, { status: 400 });
    if (!sub) return NextResponse.json({ hata: "Dekont bulunamadı." }, { status: 404 });
    if (sub.status !== "pending") return NextResponse.json({ hata: "Bu dekont zaten incelenmiş." }, { status: 400 });

    const newStatus = body.action === "approve" ? "approved" : "rejected";
    const { error: updSubErr } = await admin
      .from("payment_submissions")
      .update({
        status: newStatus as any,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_note: body.note ?? null
      })
      .eq("id", sub.id);
    if (updSubErr) return NextResponse.json({ hata: updSubErr.message ?? "Dekont güncellenemedi." }, { status: 400 });

    const { data: sp, error: spErr } = await admin
      .from("student_payments")
      .select("id,student_id,donem,gelir_kategorisi,tutar_toplam,tutar_odenen,son_odeme_tarihi,durum")
      .eq("id", sub.student_payment_id)
      .maybeSingle();
    if (spErr) return NextResponse.json({ hata: spErr.message ?? "Öğrenci ödeme kaydı okunamadı." }, { status: 400 });
    if (!sp) return NextResponse.json({ hata: "Ödeme kaydı bulunamadı." }, { status: 404 });

    const { data: st, error: stErr } = await admin
      .from("students")
      .select("id,ad_soyad,parent_id,student_user_id")
      .eq("id", sp.student_id)
      .maybeSingle();
    if (stErr) return NextResponse.json({ hata: stErr.message ?? "Öğrenci okunamadı." }, { status: 400 });

    // approve: student_payments + financial_transactions + notifications
    if (body.action === "approve") {
      const paid = Number(sp.tutar_odenen ?? 0) + Number(sub.amount ?? 0);
      const total = Number(sp.tutar_toplam ?? 0);
      const due = toDateStr(sp.son_odeme_tarihi);
      const today = new Date().toISOString().slice(0, 10);

      let durum: "ödendi" | "ödenmedi" | "gecikmiş" | "kısmi";
      if (paid >= total) durum = "ödendi";
      else if (today > due) durum = "gecikmiş";
      else if (paid > 0) durum = "kısmi";
      else durum = "ödenmedi";

      const { error: updSpErr } = await admin
        .from("student_payments")
        .update({ tutar_odenen: paid, durum: durum as any })
        .eq("id", sp.id);
      if (updSpErr) return NextResponse.json({ hata: updSpErr.message ?? "Ödeme durumu güncellenemedi." }, { status: 400 });

      const tarih = toDateStr(sub.paid_at);
      const aciklama = st?.ad_soyad
        ? `Ödeme onayı: ${st.ad_soyad} (${sp.donem}) - ${sp.gelir_kategorisi}`
        : `Ödeme onayı: (${sp.donem}) - ${sp.gelir_kategorisi}`;

      const { error: txErr } = await admin.from("financial_transactions").insert({
        tur: "gelir",
        kategori: sp.gelir_kategorisi,
        tutar: sub.amount,
        tarih,
        aciklama,
        created_by: user.id
      });
      if (txErr) return NextResponse.json({ hata: txErr.message ?? "Finans kaydı eklenemedi." }, { status: 400 });

      const notifText = `${sp.gelir_kategorisi} (${sp.donem}) ödemeniz onaylandı. Teşekkürler.`;
      const payload = {
        tur: "odeme_onay",
        student_payment_id: String(sp.id),
        submission_id: String(sub.id)
      };
      if (st?.parent_id) {
        await admin.from("notifications").insert({
          user_id: st.parent_id,
          baslik: "Ödeme Onaylandı",
          icerik: notifText,
          veri: payload as any
        });
      }
      if (st?.student_user_id) {
        await admin.from("notifications").insert({
          user_id: st.student_user_id,
          baslik: "Ödeme Onaylandı",
          icerik: notifText,
          veri: payload as any
        });
      }
    } else {
      const notifText = body.note ?? "Ödeme bildiriminiz reddedildi. Lütfen dekontu kontrol edip tekrar gönderin.";
      const payload = {
        tur: "odeme_red",
        student_payment_id: String(sp.id),
        submission_id: String(sub.id)
      };
      if (st?.parent_id) {
        await admin.from("notifications").insert({
          user_id: st.parent_id,
          baslik: "Ödeme Reddedildi",
          icerik: notifText,
          veri: payload as any
        });
      }
      if (st?.student_user_id) {
        await admin.from("notifications").insert({
          user_id: st.student_user_id,
          baslik: "Ödeme Reddedildi",
          icerik: notifText,
          veri: payload as any
        });
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return jsonError(e);
  }
}
