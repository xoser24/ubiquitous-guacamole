"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

export function AttendanceClient({
  trainingSessionId,
  students,
  initialMap,
  canEdit
}: {
  trainingSessionId: string;
  students: { id: string; ad_soyad: string; yas_grubu: string }[];
  initialMap: Record<
    string,
    | { durum: "geldi" | "gelmedi" | "izinli"; notu?: string | null; updated_at?: string | null }
    | "geldi"
    | "gelmedi"
    | "izinli"
  >;
  canEdit: boolean;
}) {
  const reduce = useReducedMotion();
  const [map, setMap] = useState<Record<string, { durum: "geldi" | "gelmedi" | "izinli"; notu?: string | null; updated_at?: string | null }>>(() => {
    const m: any = {};
    Object.entries(initialMap ?? {}).forEach(([k, v]) => {
      if (typeof v === "string") m[k] = { durum: v };
      else m[k] = { durum: v.durum, notu: v.notu ?? null, updated_at: v.updated_at ?? null };
    });
    return m;
  });
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [q, setQ] = useState<string>("");

  const summary = students.reduce(
    (acc, s) => {
      const d = map[s.id]?.durum ?? "gelmedi";
      acc.total += 1;
      if (d === "geldi") acc.geldi += 1;
      else if (d === "izinli") acc.izinli += 1;
      else acc.gelmedi += 1;
      return acc;
    },
    { total: 0, geldi: 0, gelmedi: 0, izinli: 0 }
  );

  async function kaydet(studentId: string, patch: { durum?: "geldi" | "gelmedi" | "izinli"; notu?: string | null }) {
    setHata(null);
    setBilgi(null);
    try {
      setSavingId(studentId);
      const current = map[studentId] ?? { durum: "gelmedi" as const, notu: null };
      const durum = patch.durum ?? current.durum ?? "gelmedi";
      const notu = patch.notu !== undefined ? patch.notu : current.notu ?? null;
      const r = await fetch("/api/trainings/attendance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ trainingSessionId, studentId, durum, notu })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.hata ?? "Yoklama güncellenemedi.");
      setMap((m) => ({
        ...m,
        [studentId]: { durum, notu, updated_at: new Date().toISOString() }
      }));
      setBilgi("Yoklama kaydedildi.");
    } catch (e: any) {
      const msg =
        e?.message ||
        e?.details ||
        "Yoklama güncellenemedi.";
      setHata(msg);
    } finally {
      setSavingId(null);
    }
  }

  async function toplu(durum: "geldi" | "gelmedi" | "izinli") {
    setHata(null);
    setBilgi(null);
    try {
      // Hızlı toplu işlem: paralel istekler (rate-limit 120/dk altında)
      await Promise.all(students.map((s) => kaydet(s.id, { durum })));
      setBilgi(`Toplu yoklama işlendi: ${durum}`);
    } catch (e: any) {
      setHata(e?.message ?? "Toplu işlem başarısız.");
    }
  }

  const filteredStudents = students.filter((s) => {
    if (!q.trim()) return true;
    const hay = `${s.ad_soyad} ${s.yas_grubu}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <div className="card card-neon p-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <div>
          <div className="font-semibold">Yoklama</div>
          <div className="text-xs text-[color:var(--muted)] mt-1">
            Toplam: {summary.total} • Geldi: {summary.geldi} • Gelmedi: {summary.gelmedi} • İzinli: {summary.izinli}
          </div>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost" onClick={() => toplu("geldi")}>
              Hepsi Geldi
            </button>
            <button type="button" className="btn-ghost" onClick={() => toplu("gelmedi")}>
              Hepsi Gelmedi
            </button>
            <button type="button" className="btn-ghost" onClick={() => toplu("izinli")}>
              Hepsi İzinli
            </button>
          </div>
        )}
      </div>

      <div className="mb-4">
        <input className="input w-full" placeholder="Oyuncu ara..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="space-y-3">
        {filteredStudents.map((s, idx) => (
          <motion.div
            key={s.id}
            className="rounded-xl border border-white/10 bg-white/5 p-3"
            initial={reduce ? undefined : { opacity: 0, y: 8 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(0.15, idx * 0.01), ease: "easeOut" }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold truncate">{s.ad_soyad}</div>
                <div className="text-xs text-[color:var(--muted)]">{s.yas_grubu}</div>
              </div>

              <div className="flex items-center gap-2">
                {canEdit ? (
                  <>
                    <button
                      type="button"
                      className={map[s.id]?.durum === "geldi" ? "btn-primary" : "btn-ghost"}
                      onClick={() => kaydet(s.id, { durum: "geldi" })}
                      disabled={savingId === s.id}
                    >
                      Geldi
                    </button>
                    <button
                      type="button"
                      className={map[s.id]?.durum === "gelmedi" ? "btn-primary" : "btn-ghost"}
                      onClick={() => kaydet(s.id, { durum: "gelmedi" })}
                      disabled={savingId === s.id}
                    >
                      Gelmedi
                    </button>
                    <button
                      type="button"
                      className={map[s.id]?.durum === "izinli" ? "btn-primary" : "btn-ghost"}
                      onClick={() => kaydet(s.id, { durum: "izinli" })}
                      disabled={savingId === s.id}
                    >
                      İzinli
                    </button>
                    {savingId === s.id && <span className="text-xs text-[color:var(--muted)]">Kaydediliyor…</span>}
                  </>
                ) : (
                  <span className="chip">{map[s.id]?.durum ?? "gelmedi"}</span>
                )}
              </div>
            </div>

            <div className="mt-3">
              <div className="text-xs text-[color:var(--muted)] mb-1">Not (kayıtlı):</div>
              {canEdit ? (
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    value={map[s.id]?.notu ?? ""}
                    placeholder="Örn: 10 dk geç geldi, hafif ağrı…"
                    onChange={(e) => setMap((m) => ({ ...m, [s.id]: { ...(m[s.id] ?? { durum: "gelmedi" }), notu: e.target.value } }))}
                  />
                  <button type="button" className="btn-ghost" onClick={() => kaydet(s.id, { notu: map[s.id]?.notu ?? "" })} disabled={savingId === s.id}>
                    Kaydet
                  </button>
                </div>
              ) : (
                <div className="text-sm">{map[s.id]?.notu ? map[s.id]?.notu : <span className="text-[color:var(--muted)]">—</span>}</div>
              )}
            </div>

            {map[s.id]?.updated_at && (
              <div className="mt-2 text-[11px] text-[color:var(--muted)]">
                Son güncelleme: {new Date(map[s.id].updated_at as string).toLocaleString("tr-TR")}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {bilgi && <div className="text-sm text-[color:var(--success)] mt-3">{bilgi}</div>}
      {hata && <div className="text-sm text-[color:var(--danger)] mt-3">{hata}</div>}
    </div>
  );
}
