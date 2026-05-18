import { redirect } from "next/navigation";
import { girisZorunlu } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import dayjs from "dayjs";

type Bucket = "🟢 Düzenli Ödeyen" | "🟡 Riskli" | "🔴 Kritik Gecikmeli";

export default async function FinansRiskPage() {
  const { profil } = await girisZorunlu();
  if (profil.rol !== "admin") redirect("/yetkisiz");

  const sb = await supabaseServer();
  const today = dayjs().format("YYYY-MM-DD");
  const last12 = dayjs().subtract(12, "month").format("YYYY-MM");

  const { data: rows } = await sb
    .from("student_payments")
    .select("student_id, donem, tutar_toplam, tutar_odenen, son_odeme_tarihi, durum, students(parent_id, veli_adi, veli_telefon)")
    .eq("iptal", false)
    // Performans için varsayılan olarak son 12 ay ile sınırla
    .gte("donem", last12)
    .limit(8000);

  const map = new Map<
    string,
    {
      parent_id: string;
      veli_adi: string;
      veli_telefon: string;
      totalDue: number;
      totalPaid: number;
      delayedDaysTotal: number;
      delayedCount: number;
      openCount: number;
    }
  >();

  (rows ?? []).forEach((p: any) => {
    const st = p.students;
    const parentId = st?.parent_id;
    if (!parentId) return;
    const total = Number(p.tutar_toplam ?? 0);
    const paid = Number(p.tutar_odenen ?? 0);
    const remaining = Math.max(0, total - paid);
    const cur =
      map.get(parentId) ??
      ({
        parent_id: parentId,
        veli_adi: st?.veli_adi ?? "Veli",
        veli_telefon: st?.veli_telefon ?? "-",
        totalDue: 0,
        totalPaid: 0,
        delayedDaysTotal: 0,
        delayedCount: 0,
        openCount: 0
      } as any);

    cur.totalDue += total;
    cur.totalPaid += paid;
    if (remaining > 0) cur.openCount += 1;

    const late = remaining > 0 ? dayjs(today).diff(dayjs(p.son_odeme_tarihi), "day") : 0;
    if (late > 0) {
      cur.delayedDaysTotal += late;
      cur.delayedCount += 1;
    }

    map.set(parentId, cur);
  });

  const items = Array.from(map.values()).map((x) => {
    const avgDelay = x.delayedCount > 0 ? Math.round(x.delayedDaysTotal / x.delayedCount) : 0;
    const consistency = x.totalDue > 0 ? Math.round((x.totalPaid / x.totalDue) * 100) : 0;
    const score = Math.min(100, avgDelay * 2 + (100 - consistency));
    let bucket: Bucket = "🟢 Düzenli Ödeyen";
    if (score >= 60 || avgDelay >= 30) bucket = "🔴 Kritik Gecikmeli";
    else if (score >= 30 || avgDelay >= 7) bucket = "🟡 Riskli";
    return { ...x, avgDelay, consistency, score, bucket };
  });

  items.sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-6">
      <div className="card card-neon p-6">
        <div className="text-2xl font-semibold">👨‍👩‍👦 Veli Risk Analizi</div>
        <div className="text-sm text-[color:var(--muted)] mt-1">
          Otomatik sınıflandırma (MVP): gecikme günleri + tahsilat tutarlılığı
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.slice(0, 300).map((v) => (
          <div key={v.parent_id} className="card card-neon card-neon-hover p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-lg font-semibold truncate">{v.veli_adi}</div>
                <div className="text-sm text-[color:var(--muted)] mt-0.5">{v.veli_telefon}</div>
              </div>
              <span className="chip">{v.bucket}</span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-[color:var(--muted)]">Risk skoru</div>
                <div className="font-semibold">{v.score}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-[color:var(--muted)]">Ort. gecikme</div>
                <div className="font-semibold">{v.avgDelay}g</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-[color:var(--muted)]">Tutarlılık</div>
                <div className="font-semibold">%{v.consistency}</div>
              </div>
            </div>

            <div className="mt-3 text-xs text-[color:var(--muted)]">
              Açık borç: {v.openCount} • Geciken kayıt: {v.delayedCount}
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="card card-neon p-6 text-[color:var(--muted)]">Kayıt yok.</div>}
      </div>
    </div>
  );
}
