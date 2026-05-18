import Link from "next/link";
import { girisZorunlu } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { PremiumPlayerCard } from "@/components/students/PremiumPlayerCard";

export default async function OgrencilerPage() {
  const { user, profil } = await girisZorunlu();
  const sb = await supabaseServer();

  let q = sb
    .from("students")
    .select(
      "id, ad_soyad, yas_grubu, mevki, ayak, boy_cm, kilo_kg, coach_id, parent_id, student_user_id, dogum_tarihi, created_at, student_performance_current(hiz,sut,pas,dayaniklilik,disiplin), student_health(aktif_sakatlik)"
    )
    .order("created_at", { ascending: false });

  if (profil.rol === "antrenor") q = q.eq("coach_id", user.id);
  if (profil.rol === "veli") q = q.eq("parent_id", user.id);
  if (profil.rol === "ogrenci") q = q.eq("student_user_id", user.id);

  const { data: ogrenciler, error } = await q;
  if (error) {
    return <div className="card card-neon p-6">Öğrenciler yüklenemedi.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Öğrenciler</h1>
          <div className="text-sm text-[color:var(--muted)]">
            Oyuncu kartları, sağlık ve performans takibi
          </div>
        </div>
        {profil.rol === "admin" && (
          <Link href="/admin/ogrenci-olustur" className="btn-primary">
            Yeni Öğrenci
          </Link>
        )}
      </div>

      <div className="card card-neon p-6">
        {ogrenciler.length === 0 ? (
          <div className="text-[color:var(--muted)]">Kayıt bulunamadı.</div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {ogrenciler.map((o) => (
              (() => {
                const perf = Array.isArray(o.student_performance_current)
                  ? o.student_performance_current[0]
                  : o.student_performance_current;
                const health = Array.isArray(o.student_health) ? o.student_health[0] : o.student_health;
                const aktifSakatlik = health?.aktif_sakatlik as string | null | undefined;
                return (
                  <PremiumPlayerCard
                    key={o.id}
                    id={o.id}
                    ad_soyad={o.ad_soyad}
                    yas_grubu={o.yas_grubu}
                    mevki={o.mevki}
                    ayak={o.ayak}
                    boy_cm={o.boy_cm}
                    kilo_kg={o.kilo_kg}
                    aktifSakatlik={aktifSakatlik ?? null}
                    perf={{
                      hiz: perf?.hiz ?? null,
                      sut: perf?.sut ?? null,
                      pas: perf?.pas ?? null,
                      dayaniklilik: perf?.dayaniklilik ?? null
                    }}
                  />
                );
              })()
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
