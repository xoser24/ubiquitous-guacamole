import Link from "next/link";
import { redirect } from "next/navigation";
import { girisZorunlu } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Search = { from?: string; to?: string };

function onlyDate(s: string) {
  // YYYY-MM-DD
  return s?.slice(0, 10);
}

export default async function YoklamaListesiPage({
  searchParams
}: {
  searchParams?: Promise<Search>;
}) {
  const { user, profil } = await girisZorunlu();
  if (profil.rol !== "admin" && profil.rol !== "antrenor") redirect("/yetkisiz");

  const sp = (await searchParams) ?? {};
  const from = sp.from;
  const to = sp.to;

  const admin = supabaseAdmin();

  let q = admin
    .from("training_sessions")
    .select("id, baslik, tarih, saat, konum, coach_id")
    .eq("iptal", false)
    .order("tarih", { ascending: false })
    .limit(200);

  if (profil.rol === "antrenor") q = q.eq("coach_id", user.id);
  if (from) q = q.gte("tarih", from);
  if (to) q = q.lte("tarih", to);

  const { data: sessions } = await q;
  const sessionIds = (sessions ?? []).map((s) => s.id);

  let attendanceRows: any[] = [];
  if (sessionIds.length > 0) {
    const { data } = await admin
      .from("attendance")
      .select(
        "training_session_id, student_id, durum, notu, updated_at, training_sessions(tarih, baslik, saat, konum), students(ad_soyad)"
      )
      .in("training_session_id", sessionIds);
    attendanceRows = data ?? [];
  }

  // Session map
  const bySession: Record<
    string,
    {
      id: string;
      baslik: string;
      tarih: string;
      saat: string;
      konum: string;
      rows: { student_id: string; ad_soyad: string; durum: string; notu?: string | null; updated_at?: string | null }[];
    }
  > = {};

  (sessions ?? []).forEach((s: any) => {
    bySession[s.id] = {
      id: s.id,
      baslik: s.baslik,
      tarih: s.tarih,
      saat: s.saat,
      konum: s.konum,
      rows: []
    };
  });

  attendanceRows.forEach((r: any) => {
    const sid = r.training_session_id;
    if (!bySession[sid]) return;
    bySession[sid].rows.push({
      student_id: r.student_id,
      ad_soyad: r.students?.ad_soyad ?? "-",
      durum: r.durum,
      notu: r.notu ?? null,
      updated_at: r.updated_at ?? null
    });
  });

  // Group by date
  const byDate: Record<string, { date: string; sessions: any[] }> = {};
  Object.values(bySession).forEach((s) => {
    const d = s.tarih;
    byDate[d] ??= { date: d, sessions: [] };
    byDate[d].sessions.push(s);
  });
  const days = Object.values(byDate).sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Yoklama Listesi</h1>
          <div className="text-sm text-[color:var(--muted)]">
            Tarih bazında kim geldi / kim izinli / kim gelmedi
          </div>
        </div>

        <form className="flex flex-wrap items-end gap-2" action="/yoklama">
          <div>
            <div className="text-xs text-[color:var(--muted)] mb-1">Başlangıç</div>
            <input className="input" type="date" name="from" defaultValue={from ?? ""} />
          </div>
          <div>
            <div className="text-xs text-[color:var(--muted)] mb-1">Bitiş</div>
            <input className="input" type="date" name="to" defaultValue={to ?? ""} />
          </div>
          <button className="btn-primary" type="submit">
            Filtrele
          </button>
        </form>
      </div>

      {days.length === 0 ? (
        <div className="card card-neon p-6 text-[color:var(--muted)]">Kayıt bulunamadı.</div>
      ) : (
        <div className="space-y-4">
          {days.map((day) => (
            <div key={day.date} className="card card-neon p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="font-semibold">{day.date}</div>
                <div className="text-sm text-[color:var(--muted)]">Oturum: {day.sessions.length}</div>
              </div>

              <div className="mt-4 space-y-3">
                {day.sessions.map((s) => {
                  const counts = s.rows.reduce(
                    (acc: any, r: any) => {
                      acc.total += 1;
                      if (r.durum === "geldi") acc.geldi += 1;
                      else if (r.durum === "izinli") acc.izinli += 1;
                      else acc.gelmedi += 1;
                      return acc;
                    },
                    { total: 0, geldi: 0, gelmedi: 0, izinli: 0 }
                  );

                  return (
                    <div key={s.id} className="rounded-xl border border-white/10 bg-white/5 p-4 hover:border-[color:var(--accent-a)]/25 transition">
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div className="min-w-0">
                          <Link className="font-semibold hover:underline" href={`/antrenmanlar/${s.id}`}>
                            {s.baslik}
                          </Link>
                          <div className="text-sm text-[color:var(--muted)] mt-1">
                            {s.saat} • {s.konum}
                          </div>
                        </div>
                        <div className="text-sm text-[color:var(--muted)]">
                          Toplam: {counts.total} • Geldi: {counts.geldi} • Gelmedi: {counts.gelmedi} • İzinli: {counts.izinli}
                        </div>
                      </div>

                      <div className="mt-3 overflow-auto">
                        <table className="w-full text-sm">
                          <thead className="text-[color:var(--muted)]">
                            <tr>
                              <th className="text-left py-2">Öğrenci</th>
                              <th className="text-left py-2">Durum</th>
                              <th className="text-left py-2">Not</th>
                              <th className="text-left py-2">Son güncelleme</th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.rows.length === 0 ? (
                              <tr className="border-t border-white/10">
                                <td className="py-2 text-[color:var(--muted)]" colSpan={4}>
                                  Bu oturum için yoklama kaydı yok.
                                </td>
                              </tr>
                            ) : (
                              s.rows
                                .sort((a: any, b: any) => (a.ad_soyad ?? "").localeCompare(b.ad_soyad ?? "", "tr"))
                                .map((r: any) => (
                                  <tr key={r.student_id} className="border-t border-white/10">
                                    <td className="py-2">{r.ad_soyad}</td>
                                    <td className="py-2">
                                      <span className="chip">{r.durum}</span>
                                    </td>
                                    <td className="py-2">{r.notu ? r.notu : <span className="text-[color:var(--muted)]">—</span>}</td>
                                    <td className="py-2 text-[color:var(--muted)]">{r.updated_at ? onlyDate(r.updated_at) : "—"}</td>
                                  </tr>
                                ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
