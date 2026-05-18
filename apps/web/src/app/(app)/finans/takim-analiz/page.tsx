import { redirect } from "next/navigation";
import { girisZorunlu } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import dayjs from "dayjs";

export default async function FinansTakimAnalizPage() {
  const { profil } = await girisZorunlu();
  if (profil.rol !== "admin") redirect("/yetkisiz");

  const sb = await supabaseServer();
  const today = dayjs().format("YYYY-MM-DD");
  const last12 = dayjs().subtract(12, "month").format("YYYY-MM");

  const { data: rows } = await sb
    .from("student_payments")
    .select("donem, tutar_toplam, tutar_odenen, son_odeme_tarihi, durum, students(yas_grubu)")
    .eq("iptal", false)
    .gte("donem", last12)
    .limit(10000);

  const map = new Map<
    string,
    { total: number; paid: number; remaining: number; overdueCount: number; openCount: number; payerCount: number }
  >();

  (rows ?? []).forEach((p: any) => {
    const team = p.students?.yas_grubu ?? "Bilinmeyen";
    const total = Number(p.tutar_toplam ?? 0);
    const paid = Number(p.tutar_odenen ?? 0);
    const remaining = Math.max(0, total - paid);
    const cur = map.get(team) ?? { total: 0, paid: 0, remaining: 0, overdueCount: 0, openCount: 0, payerCount: 0 };
    cur.total += total;
    cur.paid += paid;
    cur.remaining += remaining;
    if (remaining > 0) cur.openCount += 1;
    if (remaining > 0 && p.son_odeme_tarihi < today) cur.overdueCount += 1;
    cur.payerCount += 1;
    map.set(team, cur);
  });

  const items = Array.from(map.entries()).map(([team, v]) => {
    const collectionRate = v.total > 0 ? Math.round((v.paid / v.total) * 100) : 0;
    const overdueRate = v.openCount > 0 ? Math.round((v.overdueCount / v.openCount) * 100) : 0;
    return { team, ...v, collectionRate, overdueRate };
  });
  items.sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      <div className="card card-neon p-6">
        <div className="text-2xl font-semibold">⚽ Takım / Yaş Grubu Finans Analizi</div>
        <div className="text-sm text-[color:var(--muted)] mt-1">Yaş gruplarına göre gelir ve gecikme oranları (MVP)</div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((t) => (
          <div key={t.team} className="card card-neon card-neon-hover p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="text-lg font-semibold">{t.team}</div>
              <span className="chip">%{t.collectionRate} tahsilat</span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-[color:var(--muted)]">Toplam</div>
                <div className="font-semibold">{t.total.toLocaleString("tr-TR")} ₺</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-[color:var(--muted)]">Ödenen</div>
                <div className="font-semibold">{t.paid.toLocaleString("tr-TR")} ₺</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-[color:var(--muted)]">Kalan</div>
                <div className="font-semibold">{t.remaining.toLocaleString("tr-TR")} ₺</div>
              </div>
            </div>

            <div className="mt-3 text-xs text-[color:var(--muted)]">
              Gecikme oranı: %{t.overdueRate} • Açık borç: {t.openCount} • Toplam kayıt: {t.payerCount}
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="card card-neon p-6 text-[color:var(--muted)]">Kayıt yok.</div>}
      </div>
    </div>
  );
}
