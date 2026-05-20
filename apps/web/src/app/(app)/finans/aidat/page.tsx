import { redirect } from "next/navigation";
import { girisZorunlu } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import dayjs from "dayjs";
import { PaymentApprovalsClient } from "@/components/finance/PaymentApprovalsClient";
import { AidatStudentsTableClient } from "@/components/finance/AidatStudentsTableClient";

export default async function FinansAidatPage() {
  const { profil } = await girisZorunlu();
  if (profil.rol !== "admin") redirect("/yetkisiz");

  const sb = await supabaseServer();
  const monthKey = dayjs().format("YYYY-MM");

  // Operasyon ekranı için temel dataset (MVP):
  // - öğrenciler (takım/yas grubu + veli telefon)
  // - student_payments (kalan borç + son ödeme + durum)
  // - bekleyen dekontlar (admin onayı)
  // Not: Prod DB'de yeni kolonlar henüz yoksa sayfa patlamasın diye students select için fallback var.
  const studentsReq = await sb
    .from("students")
    .select("id, ad_soyad, yas_grubu, veli_telefon, parent_id, aidat_vade_gunu, aylik_aidat_tutar")
    .order("ad_soyad", { ascending: true })
    .limit(2000);
  const studentsFallback =
    studentsReq.error && /aidat_vade_gunu|aylik_aidat_tutar/i.test(studentsReq.error.message ?? "")
      ? await sb.from("students").select("id, ad_soyad, yas_grubu, veli_telefon, parent_id").order("ad_soyad", { ascending: true }).limit(2000)
      : null;
  const students = (studentsFallback?.data ?? studentsReq.data) as any[] | null;

  const [{ data: payments }, { data: pendingSubs }] = await Promise.all([
    sb
      .from("student_payments")
      .select("id, student_id, donem, gelir_kategorisi, tutar_toplam, tutar_odenen, son_odeme_tarihi, durum, iptal")
      .eq("iptal", false)
      .order("son_odeme_tarihi", { ascending: true })
      .limit(4000),
    sb
      .from("payment_submissions")
      .select("id, amount, paid_at, status, student_payment_id, student_payments(donem, gelir_kategorisi, students(ad_soyad))")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(400)
  ]);

  const pendings = ((pendingSubs ?? []) as any[]).map((s: any) => ({
    id: s.id,
    amount: s.amount,
    paid_at: s.paid_at,
    donem: s.student_payments?.donem,
    gelir_kategorisi: s.student_payments?.gelir_kategorisi,
    student_name: s.student_payments?.students?.ad_soyad
  }));

  return (
    <div className="space-y-6">
      <div className="card card-neon p-6">
        <div className="text-2xl font-semibold">📋 Aidat Takibi</div>
        <div className="text-sm text-[color:var(--muted)] mt-1">
          Operasyon ekranı: kim ödedi, kim gecikti, WhatsApp ile tahsilat yönetimi
        </div>
      </div>

      <PaymentApprovalsClient initial={pendings} />

      <AidatStudentsTableClient students={(students ?? []) as any} payments={(payments ?? []) as any} />
    </div>
  );
}
