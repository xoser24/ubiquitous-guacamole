import { redirect } from "next/navigation";
import { girisZorunlu } from "@/lib/auth";
import dayjs from "dayjs";
import { supabaseServer } from "@/lib/supabase/server";
import { FinanceOpsCenterClient } from "@/components/finance/ops/FinanceOpsCenterClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FinansPage() {
  const { profil } = await girisZorunlu();
  if (profil.rol !== "admin") redirect("/yetkisiz");

  const sb = await supabaseServer();

  const ay = dayjs().format("YYYY-MM");
  const ayBas = dayjs().startOf("month").format("YYYY-MM-DD");
  const ayBit = dayjs().add(1, "month").startOf("month").format("YYYY-MM-DD");
  const today = dayjs().format("YYYY-MM-DD");
  const next7 = dayjs().add(7, "day").format("YYYY-MM-DD");
  const prevAyBas = dayjs().subtract(1, "month").startOf("month").format("YYYY-MM-DD");
  const prevAyBit = dayjs().startOf("month").format("YYYY-MM-DD");
  const twoMonthsAgo = dayjs().subtract(2, "month").startOf("month").format("YYYY-MM-DD");

  // Dashboard data (backend değişmeden, sadece görünürlük/operasyon odaklı)
  const [
    { data: students },
    { data: txAy },
    { data: txPrev },
    { data: txRecent },
    { data: aidatThisMonth },
    { data: overdueSp },
    { data: upcomingSp },
    { data: pendingSubs }
  ] = await Promise.all([
    sb
      .from("students")
      .select("id, ad_soyad, yas_grubu, veli_telefon, parent_id, aidat_vade_gunu, aylik_aidat_tutar")
      .order("ad_soyad", { ascending: true })
      .limit(2500),
    sb
      .from("financial_transactions")
      .select("id, tur, kategori, tutar, tarih, aciklama, student_id, created_at")
      .eq("iptal", false)
      .gte("tarih", ayBas)
      .lt("tarih", ayBit)
      .order("tarih", { ascending: false })
      .limit(5000),
    sb
      .from("financial_transactions")
      .select("tur, tutar, tarih")
      .eq("iptal", false)
      .gte("tarih", prevAyBas)
      .lt("tarih", prevAyBit)
      .order("tarih", { ascending: false })
      .limit(5000),
    sb
      .from("financial_transactions")
      .select("id, tur, kategori, tutar, tarih, aciklama, student_id, created_at")
      .eq("iptal", false)
      .order("tarih", { ascending: false })
      .limit(80),
    sb
      .from("student_payments")
      .select("id, student_id, donem, gelir_kategorisi, tutar_toplam, tutar_odenen, son_odeme_tarihi, durum, updated_at, iptal")
      .eq("iptal", false)
      .eq("donem", ay)
      .eq("gelir_kategorisi", "Aylık Aidat")
      .limit(2500),
    sb
      .from("student_payments")
      .select("id, student_id, donem, gelir_kategorisi, tutar_toplam, tutar_odenen, son_odeme_tarihi, durum, updated_at")
      .eq("iptal", false)
      .lt("son_odeme_tarihi", today)
      .neq("durum", "ödendi")
      .order("son_odeme_tarihi", { ascending: true })
      .limit(2500),
    sb
      .from("student_payments")
      .select("id, student_id, donem, gelir_kategorisi, tutar_toplam, tutar_odenen, son_odeme_tarihi, durum, updated_at")
      .eq("iptal", false)
      .gte("son_odeme_tarihi", today)
      .lte("son_odeme_tarihi", next7)
      .neq("durum", "ödendi")
      .order("son_odeme_tarihi", { ascending: true })
      .limit(2500),
    sb
      .from("payment_submissions")
      .select("id, amount, paid_at, status, student_payment_id, student_payments(donem, gelir_kategorisi, student_id, students(ad_soyad))")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(200)
  ]);

  const txAyList = (txAy ?? []) as any[];
  const txPrevList = (txPrev ?? []) as any[];

  const sumTx = (list: any[]) => {
    let gelir = 0;
    let gider = 0;
    list.forEach((t) => (t.tur === "gelir" ? (gelir += Number(t.tutar)) : (gider += Number(t.tutar))));
    return { gelir, gider, net: gelir - gider };
  };
  const ayTotals = sumTx(txAyList);
  const prevTotals = sumTx(txPrevList);

  const overdueList = (overdueSp ?? []) as any[];
  const overdueAmount = overdueList.reduce((acc, p) => acc + Math.max(0, Number(p.tutar_toplam) - Number(p.tutar_odenen ?? 0)), 0);

  const aidatList = (aidatThisMonth ?? []) as any[];
  const aidatTotal = aidatList.reduce((acc, p) => acc + Number(p.tutar_toplam ?? 0), 0);
  const aidatPaid = aidatList.reduce((acc, p) => acc + Number(p.tutar_odenen ?? 0), 0);
  const tahsilatOrani = aidatTotal > 0 ? Math.round((aidatPaid / aidatTotal) * 100) : 0;

  // Riskli veli: son 2 ay içinde gecikmesi olan benzersiz parent_id
  const { data: riskRaw } = await sb
    .from("student_payments")
    .select("student_id, son_odeme_tarihi, durum, students(parent_id)")
    .eq("iptal", false)
    .gte("son_odeme_tarihi", twoMonthsAgo)
    .lt("son_odeme_tarihi", today)
    .neq("durum", "ödendi")
    .limit(4000);
  const riskParents = new Set<string>();
  (riskRaw ?? []).forEach((r: any) => {
    const pid = r?.students?.parent_id;
    if (pid) riskParents.add(pid);
  });

  return (
    <FinanceOpsCenterClient
      monthKey={ay}
      today={today}
      students={(students ?? []) as any}
      aidatThisMonth={(aidatThisMonth ?? []) as any}
      overduePayments={(overdueSp ?? []) as any}
      upcomingPayments={(upcomingSp ?? []) as any}
      pendingSubmissions={(pendingSubs ?? []) as any}
      txThisMonth={txAyList}
      txRecent={(txRecent ?? []) as any}
      kpis={{
        gelir: ayTotals.gelir,
        gider: ayTotals.gider,
        net: ayTotals.net,
        gecikmisAlacak: overdueAmount,
        tahsilatOrani,
        riskliVeliler: riskParents.size,
        prevGelir: prevTotals.gelir,
        prevGider: prevTotals.gider,
        prevNet: prevTotals.net
      }}
    />
  );
}
