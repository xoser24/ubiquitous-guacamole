import Link from "next/link";
import { redirect } from "next/navigation";
import { girisZorunlu } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { AnnouncementClient } from "@/components/admin/AnnouncementClient";
import dayjs from "dayjs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function Kart({ baslik, deger }: { baslik: string; deger: string }) {
  return (
    <div className="card p-5">
      <div className="text-sm text-[color:var(--muted)]">{baslik}</div>
      <div className="text-2xl font-semibold mt-1">{deger}</div>
    </div>
  );
}

export default async function AdminPage() {
  const { profil } = await girisZorunlu();
  if (profil.rol !== "admin") redirect("/yetkisiz");

  const sb = await supabaseServer();

  const now = dayjs().format("YYYY-MM");
  const ayBas = dayjs().startOf("month").format("YYYY-MM-DD");
  const ayBit = dayjs().add(1, "month").startOf("month").format("YYYY-MM-DD");

  const [
    { count: studentCount },
    { count: coachCount },
    { data: tx },
    { data: att }
  ] = await Promise.all([
    sb.from("students").select("*", { count: "exact", head: true }),
    sb.from("profiles").select("*", { count: "exact", head: true }).eq("rol", "antrenor"),
    // Finans dashboard ile eşit: bu ay + iptal hariç
    sb
      .from("financial_transactions")
      .select("tur, tutar, tarih")
      .eq("iptal", false)
      .gte("tarih", ayBas)
      .lt("tarih", ayBit)
      .order("tarih", { ascending: false })
      .limit(5000),
    sb.from("attendance").select("durum").limit(500)
  ]);

  let gelir = 0;
  let gider = 0;
  (tx ?? []).forEach((t) => {
    if (t.tur === "gelir") gelir += Number(t.tutar);
    else gider += Number(t.tutar);
  });
  const net = gelir - gider;

  const toplamYoklama = (att ?? []).length;
  const geldi = (att ?? []).filter((a) => a.durum === "geldi").length;
  const oran = toplamYoklama ? Math.round((geldi / toplamYoklama) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Admin Paneli</h1>
          <div className="text-sm text-[color:var(--muted)]">
            Genel metrikler ve yönetim
          </div>
        </div>
        <div className="flex gap-2">
          <Link className="btn-ghost" href="/admin/whatsapp">
            📲 WhatsApp
          </Link>
          <Link className="btn-primary" href="/admin/kullanicilar">
            Kullanıcılar
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Kart baslik="Toplam Öğrenci" deger={String(studentCount ?? 0)} />
        <Kart baslik="Toplam Antrenör" deger={String(coachCount ?? 0)} />
        <Kart baslik={`Bu Ay Net Kâr (${now})`} deger={`${net.toLocaleString("tr-TR")} ₺`} />
        <Kart baslik={`Bu Ay Gelir (${now})`} deger={`${gelir.toLocaleString("tr-TR")} ₺`} />
        <Kart baslik={`Bu Ay Gider (${now})`} deger={`${gider.toLocaleString("tr-TR")} ₺`} />
        <Kart baslik="Yoklama Oranı" deger={`%${oran}`} />
      </div>

      <AnnouncementClient />
    </div>
  );
}
