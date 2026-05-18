import { redirect } from "next/navigation";
import { girisZorunlu } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import dayjs from "dayjs";
import { FinanceWhatsAppActionsClient } from "@/components/finance/FinanceWhatsAppActionsClient";

function severity(days: number) {
  if (days >= 30) return "kritik";
  if (days >= 7) return "orta";
  if (days >= 1) return "dusuk";
  return "0";
}

export default async function FinansGecikmisPage() {
  const { profil } = await girisZorunlu();
  if (profil.rol !== "admin") redirect("/yetkisiz");

  const sb = await supabaseServer();
  const today = dayjs().format("YYYY-MM-DD");

  const { data: rows } = await sb
    .from("student_payments")
    .select("id, student_id, donem, gelir_kategorisi, tutar_toplam, tutar_odenen, son_odeme_tarihi, durum, students(ad_soyad, yas_grubu, veli_telefon)")
    .lt("son_odeme_tarihi", today)
    .neq("durum", "ödendi")
    .eq("iptal", false)
    .order("son_odeme_tarihi", { ascending: true })
    .limit(2000);

  const list =
    (rows ?? []).map((p: any) => {
      const kalan = Math.max(0, Number(p.tutar_toplam) - Number(p.tutar_odenen ?? 0));
      const daysLate = dayjs(today).diff(dayjs(p.son_odeme_tarihi), "day");
      return {
        ...p,
        kalan,
        daysLate,
        sev: severity(daysLate)
      };
    }) ?? [];

  return (
    <div className="space-y-6">
      <div className="card card-neon p-6">
        <div className="text-2xl font-semibold">🔴 Gecikmiş Ödemeler</div>
        <div className="text-sm text-[color:var(--muted)] mt-1">
          Son ödeme tarihi geçmiş ve tam kapanmamış borçlar
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {list.map((p: any) => (
          <div key={p.id} className="card card-neon card-neon-hover p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-lg font-semibold truncate">{p.students?.ad_soyad ?? "-"}</div>
                <div className="text-sm text-[color:var(--muted)] mt-0.5">
                  {p.students?.yas_grubu ?? "-"} • {p.gelir_kategorisi} • {p.donem}
                </div>
              </div>
              <span className="chip">
                {p.sev === "kritik" ? "🔴 30+ gün" : p.sev === "orta" ? "🟠 7-30 gün" : "🟡 1-7 gün"}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-[color:var(--muted)]">Kalan</div>
                <div className="font-semibold">{Number(p.kalan).toLocaleString("tr-TR")} ₺</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-[color:var(--muted)]">Gecikme</div>
                <div className="font-semibold">{p.daysLate} gün</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-[color:var(--muted)]">Son tarih</div>
                <div className="font-semibold">{p.son_odeme_tarihi}</div>
              </div>
            </div>

            <div className="mt-3 text-sm text-[color:var(--muted)]">Veli Tel: {p.students?.veli_telefon ?? "-"}</div>

            <div className="mt-4">
              <FinanceWhatsAppActionsClient
                studentId={p.student_id}
                dedupeKey={`finance:overdue:${p.id}`}
                related={{ student_payment_id: p.id, tur: "gecikmis" }}
                defaultText={`💳 Aidat Hatırlatması\n\n${p.students?.ad_soyad ?? "Öğrenci"} için ${p.gelir_kategorisi} (${p.donem}) ödemesi gecikmiştir.\nSon tarih: ${p.son_odeme_tarihi}\nKalan borç: ${Number(p.kalan).toLocaleString("tr-TR")} ₺\n\nBilgi/ödeme için dönüş yapabilir misiniz?`}
              />
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="card card-neon p-6 text-[color:var(--muted)]">Gecikmiş ödeme yok.</div>}
      </div>
    </div>
  );
}
