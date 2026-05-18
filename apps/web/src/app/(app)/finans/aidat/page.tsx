import { redirect } from "next/navigation";
import { girisZorunlu } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import dayjs from "dayjs";
import { PaymentApprovalsClient } from "@/components/finance/PaymentApprovalsClient";
import { PremiumFinanceStudentCard } from "@/components/finance/PremiumFinanceStudentCard";

export default async function FinansAidatPage() {
  const { profil } = await girisZorunlu();
  if (profil.rol !== "admin") redirect("/yetkisiz");

  const sb = await supabaseServer();
  const today = dayjs().format("YYYY-MM-DD");
  const monthKey = dayjs().format("YYYY-MM");
  const months6 = Array.from({ length: 6 }).map((_, i) => dayjs(monthKey + "-01").subtract(5 - i, "month").format("YYYY-MM"));

  // Operasyon ekranı için temel dataset (MVP):
  // - öğrenciler (takım/yas grubu + veli telefon)
  // - student_payments (kalan borç + son ödeme + durum)
  // - bekleyen dekontlar (admin onayı)
  const [{ data: students }, { data: payments }, { data: pendingSubs }] = await Promise.all([
    sb
      .from("students")
      .select("id, ad_soyad, yas_grubu, coach_id, veli_telefon, parent_id")
      .order("ad_soyad", { ascending: true })
      .limit(2000),
    sb
      .from("student_payments")
      .select("id, student_id, donem, gelir_kategorisi, tutar_toplam, tutar_odenen, son_odeme_tarihi, durum")
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

  // Öğrenci bazlı özet (aidat ekranında "tek satır")
  const agg = new Map<
    string,
    { kalan: number; son_tarih?: string; durum: string; geciken_gun: number; borc_sayisi: number }
  >();
  (payments ?? []).forEach((p: any) => {
    const total = Number(p.tutar_toplam ?? 0);
    const paid = Number(p.tutar_odenen ?? 0);
    const kalan = Math.max(0, total - paid);
    if (kalan <= 0) return;
    const cur = agg.get(p.student_id) ?? { kalan: 0, son_tarih: undefined, durum: "bekliyor", geciken_gun: 0, borc_sayisi: 0 };
    cur.kalan += kalan;
    cur.borc_sayisi += 1;
    if (!cur.son_tarih || p.son_odeme_tarihi < cur.son_tarih) cur.son_tarih = p.son_odeme_tarihi;
    const late = dayjs(today).diff(dayjs(p.son_odeme_tarihi), "day");
    if (late > cur.geciken_gun) cur.geciken_gun = late;
    if (p.durum === "gecikmiş") cur.durum = "gecikmiş";
    else if (p.durum === "kısmi" && cur.durum !== "gecikmiş") cur.durum = "kısmi";
    agg.set(p.student_id, cur);
  });

  // Son 6 ay tahsilat trendi (0-100). Küçük sparkline için.
  const trendMap = new Map<string, number[]>();
  const monthAgg = new Map<string, { total: number; paid: number }>(); // key: studentId|YYYY-MM
  (payments ?? []).forEach((p: any) => {
    if (!months6.includes(p.donem)) return;
    const key = `${p.student_id}|${p.donem}`;
    const cur = monthAgg.get(key) ?? { total: 0, paid: 0 };
    cur.total += Number(p.tutar_toplam ?? 0);
    cur.paid += Number(p.tutar_odenen ?? 0);
    monthAgg.set(key, cur);
  });
  (students ?? []).forEach((s: any) => {
    const arr = months6.map((m) => {
      const a = monthAgg.get(`${s.id}|${m}`);
      if (!a || a.total <= 0) return 0;
      return Math.max(0, Math.min(100, Math.round((a.paid / a.total) * 100)));
    });
    trendMap.set(s.id, arr);
  });

  const rows = (students ?? [])
    .map((s: any) => {
      const a = agg.get(s.id);
      const kalan = a?.kalan ?? 0;
      const son = a?.son_tarih ?? null;
      const gecikme = a?.geciken_gun ?? 0;
      const durum = kalan <= 0 ? "ödendi" : a?.durum === "gecikmiş" || (son && son < today) ? "gecikmiş" : a?.durum === "kısmi" ? "kısmi" : "bekliyor";
      return { ...s, kalan, son, durum, gecikme, borc_sayisi: a?.borc_sayisi ?? 0, trend: trendMap.get(s.id) ?? [0, 0, 0, 0, 0, 0] };
    })
    .sort((a: any, b: any) => (b.gecikme ?? 0) - (a.gecikme ?? 0));

  return (
    <div className="space-y-6">
      <div className="card card-neon p-6">
        <div className="text-2xl font-semibold">📋 Aidat Takibi</div>
        <div className="text-sm text-[color:var(--muted)] mt-1">
          Operasyon ekranı: kim ödedi, kim gecikti, WhatsApp ile tahsilat yönetimi
        </div>
      </div>

      <PaymentApprovalsClient initial={pendings} />

      <div className="card card-neon p-6">
        <div className="font-semibold mb-3">Öğrenci Listesi</div>
        <div className="text-sm text-[color:var(--muted)] mb-4">
          Varsayılan sıralama: en geciken üstte (gün)
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((r: any) => (
            <PremiumFinanceStudentCard
              key={r.id}
              id={r.id}
              ad_soyad={r.ad_soyad}
              yas_grubu={r.yas_grubu}
              veli_telefon={r.veli_telefon}
              kalan={Number(r.kalan)}
              son={r.son}
              durum={r.durum}
              gecikme={Number(r.gecikme ?? 0)}
              borc_sayisi={Number(r.borc_sayisi ?? 0)}
              trend={r.trend}
            />
          ))}
          {rows.length === 0 && <div className="text-[color:var(--muted)]">Kayıt yok.</div>}
        </div>
      </div>
    </div>
  );
}
