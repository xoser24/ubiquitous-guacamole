import { girisZorunlu } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { TrainingActionsClient } from "@/components/trainings/TrainingActionsClient";
import { TrainingDetailTabsClient } from "@/components/trainings/TrainingDetailTabsClient";

export default async function AntrenmanDetayPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, profil } = await girisZorunlu();
  const { id } = await params;
  const admin = supabaseAdmin();

  const { data: oturum } = await admin
    .from("training_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!oturum) return <div className="card card-neon p-6">Antrenman bulunamadı.</div>;

  const canEdit = (profil.rol === "admin" || (profil.rol === "antrenor" && oturum.coach_id === user.id)) && !oturum.iptal;

  const { data: tss } = await admin
    .from("training_session_students")
    .select("student_id")
    .eq("training_session_id", id);

  const studentIds = (tss ?? []).map((r) => r.student_id);

  let students: any[] = [];
  if (studentIds.length > 0) {
    const { data } = await admin
      .from("students")
      .select("id, ad_soyad, yas_grubu, parent_id, student_user_id, coach_id")
      .in("id", studentIds)
      .order("ad_soyad", { ascending: true });
    students = data ?? [];
  }

  // veli/ogrenci rolünde kendi öğrencilerini filtrele
  if (profil.rol === "veli") students = students.filter((s) => s.parent_id === user.id);
  if (profil.rol === "ogrenci") students = students.filter((s) => s.student_user_id === user.id);

  const { data: att } = await admin
    .from("attendance")
    .select("student_id, durum, notu, updated_at, isaretleyen_coach_id")
    .eq("training_session_id", id);

  const map: Record<string, any> = {};
  (att ?? []).forEach((a: any) => {
    map[a.student_id] = {
      durum: a.durum,
      notu: a.notu,
      updated_at: a.updated_at,
      isaretleyen_coach_id: a.isaretleyen_coach_id
    };
  });

  return (
    <div className="space-y-6">
      <div className="card card-neon p-6 overflow-hidden relative">
        <div aria-hidden className="absolute -right-24 -top-24 h-56 w-56 rounded-full neon-dot opacity-70 pointer-events-none" />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{oturum.baslik}</h1>
            <div className="text-sm text-[color:var(--muted)] mt-1">
              {oturum.tarih} • {oturum.saat} • {oturum.konum}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {oturum.iptal && <span className="chip">İptal</span>}
            <div className="text-sm text-[color:var(--muted)]">Oyuncu: {students.length}</div>
            {canEdit && (
              <TrainingActionsClient
                session={{ id: oturum.id, baslik: oturum.baslik, tarih: oturum.tarih, saat: oturum.saat, konum: oturum.konum }}
                students={students.map((s) => ({ id: s.id, ad_soyad: s.ad_soyad }))}
              />
            )}
          </div>
        </div>
      </div>

      <TrainingDetailTabsClient
        trainingSessionId={id}
        session={{
          baslik: oturum.baslik,
          tarih: oturum.tarih,
          saat: oturum.saat,
          konum: oturum.konum,
          iptal: oturum.iptal
        }}
        students={students as any}
        initialMap={map}
        canEdit={canEdit}
      />
    </div>
  );
}
