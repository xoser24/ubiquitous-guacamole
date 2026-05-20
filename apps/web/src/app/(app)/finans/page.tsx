import { redirect } from "next/navigation";
import { girisZorunlu } from "@/lib/auth";
import Link from "next/link";
import dayjs from "dayjs";
import { supabaseServer } from "@/lib/supabase/server";

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

  const [{ data: tx }, { data: overdue }, { data: upcoming }, { data: pendingSubs }] = await Promise.all([
    // Admin panel ile aynı mantık: sadece bu ayı çek ve iptal edilenleri hariç tut
    sb
      .from("financial_transactions")
      .select("tur, tutar, tarih, kategori")
      .eq("iptal", false)
      .gte("tarih", ayBas)
      .lt("tarih", ayBit)
      .order("tarih", { ascending: false })
      .limit(5000),
    sb
      .from("student_payments")
      .select("id")
      .lt("son_odeme_tarihi", today)
      .neq("durum", "ödendi"),
    sb
      .from("student_payments")
      .select("id")
      .gte("son_odeme_tarihi", today)
      .lte("son_odeme_tarihi", next7)
      .neq("durum", "ödendi"),
    sb.from("payment_submissions").select("id").eq("status", "pending")
  ]);

  let gelir = 0;
  let gider = 0;
  (tx ?? []).forEach((t: any) => {
    if (t.tur === "gelir") gelir += Number(t.tutar);
    else gider += Number(t.tutar);
  });
  const net = gelir - gider;

  const cards = [
    { href: "/finans/aidat", title: "📋 Aidat Takibi", desc: "Öğrenci bazlı takip + gün hesabı" },
    { href: "/finans/defter", title: "💰 Gelir / Gider", desc: "Defter kayıtları + öğrenci bazlı filtre" },
    { href: "/finans/gecikmis", title: "🔴 Gecikmiş Ödemeler", desc: "Şiddet seviyeli gecikme listesi + hızlı aksiyon" },
    { href: "/finans/yaklasan", title: "📅 Yaklaşan Ödemeler", desc: "Önümüzdeki günler için proaktif takip" },
    { href: "/finans/hatirlatmalar", title: "📲 Tahsilat Hatırlatmaları", desc: "WhatsApp akışları, toplu gönderim, geçmiş" },
    { href: "/finans/raporlar", title: "📈 Finansal Raporlar", desc: "Tahsilat oranı, trendler, dışa aktarım" },
    { href: "/finans/risk", title: "👨‍👩‍👦 Veli Risk Analizi", desc: "Düzenli/Riskli/Kritik sınıflandırma" },
    { href: "/finans/takim-analiz", title: "⚽ Takım / Yaş Grubu Analizi", desc: "U10/U12 vb gelir ve gecikme oranları" }
  ];

  return (
    <div className="space-y-6">
      <div className="card card-neon p-6 overflow-hidden relative">
        <div aria-hidden className="absolute -right-24 -top-24 h-64 w-64 rounded-full neon-dot opacity-80" />
        <div aria-hidden className="absolute -left-24 -bottom-24 h-64 w-64 rounded-full neon-dot opacity-60" />

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs text-[color:var(--muted)]">⚽ Tahsilat Operasyon Merkezi</div>
            <h1 className="text-2xl md:text-3xl font-semibold mt-1">Finans</h1>
            <div className="text-sm text-[color:var(--muted)] mt-2">
              Bu ay: Gelir {gelir.toLocaleString("tr-TR")} ₺ • Gider {gider.toLocaleString("tr-TR")} ₺ • Net {net.toLocaleString("tr-TR")} ₺
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="chip">🔴 Gecikmiş: {overdue?.length ?? 0}</span>
            <span className="chip">📅 7 gün içinde: {upcoming?.length ?? 0}</span>
            <span className="chip">🧾 Bekleyen dekont: {pendingSubs?.length ?? 0}</span>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="block">
            <div className="card card-neon card-neon-hover p-4 h-full">
              <div className="text-base font-semibold leading-snug">{c.title}</div>
              <div className="text-xs text-[color:var(--muted)] mt-1 leading-relaxed">{c.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
