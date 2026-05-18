import { redirect } from "next/navigation";
import { girisZorunlu } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import dayjs from "dayjs";

export default async function FinansRaporlarPage() {
  const { profil } = await girisZorunlu();
  if (profil.rol !== "admin") redirect("/yetkisiz");

  const sb = await supabaseServer();
  const donem = dayjs().format("YYYY-MM");
  const today = dayjs().format("YYYY-MM-DD");

  const { data: payments } = await sb
    .from("student_payments")
    .select("tutar_toplam, tutar_odenen, son_odeme_tarihi, durum, donem")
    .eq("donem", donem)
    .eq("iptal", false)
    .limit(5000);

  let toplam = 0;
  let odenen = 0;
  let overdueCount = 0;
  let openCount = 0;
  (payments ?? []).forEach((p: any) => {
    const t = Number(p.tutar_toplam ?? 0);
    const o = Number(p.tutar_odenen ?? 0);
    toplam += t;
    odenen += o;
    if (o < t) openCount += 1;
    if (o < t && p.son_odeme_tarihi < today) overdueCount += 1;
  });
  const oran = toplam > 0 ? Math.round((odenen / toplam) * 100) : 0;
  const overduePct = openCount > 0 ? Math.round((overdueCount / openCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="card card-neon p-6">
        <div className="text-2xl font-semibold">📈 Finansal Raporlar</div>
        <div className="text-sm text-[color:var(--muted)] mt-1">
          Aylık tahsilat oranı, gecikme oranı ve trend özetleri (MVP)
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card card-neon p-6">
          <div className="text-sm text-[color:var(--muted)]">Bu ay tahsilat oranı</div>
          <div className="text-3xl font-semibold mt-2">%{oran}</div>
          <div className="text-sm text-[color:var(--muted)] mt-2">
            Ödenen: {odenen.toLocaleString("tr-TR")} ₺ / Toplam: {toplam.toLocaleString("tr-TR")} ₺
          </div>
        </div>
        <div className="card card-neon p-6">
          <div className="text-sm text-[color:var(--muted)]">Gecikme oranı</div>
          <div className="text-3xl font-semibold mt-2">%{overduePct}</div>
          <div className="text-sm text-[color:var(--muted)] mt-2">Açık borçlar içinde geciken oranı</div>
        </div>
        <div className="card card-neon p-6">
          <div className="text-sm text-[color:var(--muted)]">Açık borç adedi</div>
          <div className="text-3xl font-semibold mt-2">{openCount}</div>
          <div className="text-sm text-[color:var(--muted)] mt-2">Bu ay kapanmamış kalem sayısı</div>
        </div>
      </div>
    </div>
  );
}
