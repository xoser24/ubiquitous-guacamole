import Link from "next/link";
import { girisZorunlu } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { TrainingsPlannerClient } from "@/components/trainings/TrainingsPlannerClient";
import { TrainingsListClient } from "@/components/trainings/TrainingsListClient";
import { ParentMonthlyCalendarClient } from "@/components/trainings/ParentMonthlyCalendarClient";

export default async function AntrenmanlarPage() {
  const { user, profil } = await girisZorunlu();
  const admin = supabaseAdmin();

  let sessions: any[] = [];
  try {
    if (profil.rol === "admin") {
      const { data } = await admin
        .from("training_sessions")
        .select("id, baslik, tarih, saat, konum, coach_id, created_at")
        .eq("iptal", false)
        .order("tarih", { ascending: false });
      sessions = data ?? [];
    } else if (profil.rol === "antrenor") {
      const { data } = await admin
        .from("training_sessions")
        .select("id, baslik, tarih, saat, konum, coach_id, created_at")
        .eq("coach_id", user.id)
        .eq("iptal", false)
        .order("tarih", { ascending: false });
      sessions = data ?? [];
    } else if (profil.rol === "veli") {
      const { data: st } = await admin.from("students").select("id").eq("parent_id", user.id);
      const studentIds = (st ?? []).map((r) => r.id);
      if (studentIds.length > 0) {
        const { data: tss } = await admin
          .from("training_session_students")
          .select("training_session_id")
          .in("student_id", studentIds);
        const sessionIds = Array.from(new Set((tss ?? []).map((r) => r.training_session_id)));
        if (sessionIds.length > 0) {
          const { data } = await admin
            .from("training_sessions")
            .select("id, baslik, tarih, saat, konum, coach_id, created_at")
            .in("id", sessionIds)
            .eq("iptal", false)
            .order("tarih", { ascending: false });
          sessions = data ?? [];
        }
      }
    } else if (profil.rol === "ogrenci") {
      const { data: st } = await admin.from("students").select("id").eq("student_user_id", user.id);
      const studentIds = (st ?? []).map((r) => r.id);
      if (studentIds.length > 0) {
        const { data: tss } = await admin
          .from("training_session_students")
          .select("training_session_id")
          .in("student_id", studentIds);
        const sessionIds = Array.from(new Set((tss ?? []).map((r) => r.training_session_id)));
        if (sessionIds.length > 0) {
          const { data } = await admin
            .from("training_sessions")
            .select("id, baslik, tarih, saat, konum, coach_id, created_at")
            .in("id", sessionIds)
            .eq("iptal", false)
            .order("tarih", { ascending: false });
          sessions = data ?? [];
        }
      }
    }
  } catch (error) {
    console.error("[antrenmanlar] admin training_sessions load failed:", error);
    return <div className="card card-neon p-6">Antrenmanlar yüklenemedi.</div>;
  }

  const antrenorler =
    profil.rol === "admin"
      ? (
          await admin
            .from("profiles")
            .select("id, ad_soyad")
            .eq("rol", "antrenor")
            .order("ad_soyad", { ascending: true })
        ).data ?? []
      : [];

  // Veli görünümü: sadece aylık takvim + detay modal
  if (profil.rol === "veli") {
    const coachIds = Array.from(new Set((sessions ?? []).map((s: any) => s.coach_id).filter(Boolean)));
    const { data: coachProfiles } =
      coachIds.length > 0
        ? await admin.from("profiles").select("id, ad_soyad").in("id", coachIds)
        : { data: [] as any[] };
    const coachMap = new Map<string, string>();
    (coachProfiles ?? []).forEach((p: any) => coachMap.set(p.id, p.ad_soyad));

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Antrenmanlar</h1>
          <div className="text-sm text-[color:var(--muted)]">
            Aylık takvim üzerinden görüntüleme (veli modu)
          </div>
        </div>

        <ParentMonthlyCalendarClient
          sessions={(sessions ?? []).map((s: any) => ({
            id: s.id,
            baslik: s.baslik,
            tarih: s.tarih,
            saat: s.saat,
            konum: s.konum,
            coach_ad_soyad: coachMap.get(s.coach_id) ?? null
          }))}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Antrenmanlar</h1>
        <div className="text-sm text-[color:var(--muted)]">
          Oturumlar, oyuncu atama ve yoklama
        </div>
      </div>

      <TrainingsPlannerClient
        rol={profil.rol}
        antrenorler={antrenorler}
        sessions={(sessions ?? []).map((s) => ({
          id: s.id,
          baslik: s.baslik,
          tarih: s.tarih,
          saat: s.saat,
          konum: s.konum
        }))}
      />

      <TrainingsListClient
        rol={profil.rol}
        sessions={(sessions ?? []).map((s) => ({
          id: s.id,
          baslik: s.baslik,
          tarih: s.tarih,
          saat: s.saat,
          konum: s.konum
        }))}
      />
    </div>
  );
}
