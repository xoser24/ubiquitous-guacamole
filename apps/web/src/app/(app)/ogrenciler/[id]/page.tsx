import { girisZorunlu } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import {
  CoachNoteAdder,
  CurrentPerformanceEditor,
  HealthEditor,
  WeeklyPerformanceAdder,
  WeeklyTrendChart
} from "@/components/students/StudentClientActions";

function Rozet({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm">
      {label}
    </span>
  );
}

export default async function OgrenciDetayPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, profil } = await girisZorunlu();
  const { id } = await params;

  const sb = await supabaseServer();

  const { data: ogrenci } = await sb
    .from("students")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!ogrenci) return <div className="card card-neon p-6">Öğrenci bulunamadı.</div>;

  const canEdit = profil.rol === "admin" || (profil.rol === "antrenor" && ogrenci.coach_id === user.id);

  const [{ data: health }, { data: perf }, { data: logs }, { data: notes }, { data: timeline }] =
    await Promise.all([
      sb.from("student_health").select("*").eq("student_id", id).maybeSingle(),
      sb.from("student_performance_current")
        .select("*")
        .eq("student_id", id)
        .maybeSingle(),
      sb.from("performance_logs")
        .select("*")
        .eq("student_id", id)
        .order("hafta_baslangic", { ascending: true }),
      sb.from("coach_notes")
        .select("*")
        .eq("student_id", id)
        .order("created_at", { ascending: false })
        .limit(30),
      sb.from("student_timeline")
        .select("*")
        .eq("student_id", id)
        .order("created_at", { ascending: false })
        .limit(50)
    ]);

  return (
    <div className="space-y-6">
      <div className="card card-neon p-6 overflow-hidden relative">
        <div aria-hidden className="absolute -right-24 -top-24 h-56 w-56 rounded-full neon-dot opacity-70" />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{ogrenci.ad_soyad}</h1>
            <div className="text-sm text-[color:var(--muted)] mt-1">
              {ogrenci.yas_grubu} • {ogrenci.mevki} • {ogrenci.ayak} ayak
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Rozet label={`Boy: ${ogrenci.boy_cm ?? "-"} cm`} />
            <Rozet label={`Kilo: ${ogrenci.kilo_kg ?? "-"} kg`} />
            <Rozet label={`Doğum: ${ogrenci.dogum_tarihi}`} />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card card-neon p-6">
          <div className="font-semibold mb-3">Veli Bilgileri</div>
          <div className="text-sm space-y-2">
            <div>
              <span className="text-[color:var(--muted)]">Veli adı:</span>{" "}
              {ogrenci.veli_adi}
            </div>
            <div>
              <span className="text-[color:var(--muted)]">Telefon:</span>{" "}
              {ogrenci.veli_telefon}
            </div>
            <div>
              <span className="text-[color:var(--muted)]">Acil durum:</span>{" "}
              {ogrenci.acil_durum_numarasi}
            </div>
          </div>
        </div>

        <WeeklyTrendChart logs={logs ?? []} />
      </div>

      <HealthEditor studentId={id} canEdit={canEdit} initial={health} />

      <CurrentPerformanceEditor studentId={id} canEdit={canEdit} initial={perf} />

      <div className="grid lg:grid-cols-2 gap-4">
        <WeeklyPerformanceAdder studentId={id} canEdit={canEdit} />
        <CoachNoteAdder studentId={id} canEdit={canEdit} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card card-neon p-6">
          <div className="font-semibold mb-3">Antrenör Notları</div>
          {!notes || notes.length === 0 ? (
            <div className="text-[color:var(--muted)]">Henüz not yok.</div>
          ) : (
            <div className="space-y-2">
              {notes.map((n) => (
                <div key={n.id} className="rounded-xl border border-white/10 bg-white/5 p-3 hover:border-[color:var(--accent-a)]/25 transition">
                  <div className="text-sm whitespace-pre-wrap">{n.note}</div>
                  <div className="text-xs text-[color:var(--muted)] mt-1">
                    {new Date(n.created_at).toLocaleString("tr-TR")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card card-neon p-6">
          <div className="font-semibold mb-3">Gelişim Geçmişi</div>
          {!timeline || timeline.length === 0 ? (
            <div className="text-[color:var(--muted)]">Henüz kayıt yok.</div>
          ) : (
            <div className="space-y-2">
              {timeline.map((t) => (
                <div key={t.id} className="rounded-xl border border-white/10 bg-white/5 p-3 hover:border-[color:var(--accent-a)]/25 transition">
                  <div className="text-sm font-semibold">{t.ozet}</div>
                  <div className="text-xs text-[color:var(--muted)] mt-1">
                    {new Date(t.created_at).toLocaleString("tr-TR")} • {t.tur}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
