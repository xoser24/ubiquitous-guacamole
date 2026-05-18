"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export function TrainingActionsClient({
  session,
  students
}: {
  session: { id: string; baslik: string; tarih: string; saat: string; konum: string };
  students: { id: string; ad_soyad: string }[];
}) {
  const reduce = useReducedMotion();
  const [loading, setLoading] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [modal, setModal] = useState<null | "edit" | "cancel">(null);

  // edit state
  const [baslik, setBaslik] = useState(session.baslik);
  const [tarih, setTarih] = useState(session.tarih);
  const [saat, setSaat] = useState(session.saat);
  const [konum, setKonum] = useState(session.konum);
  const [q, setQ] = useState("");
  const [secili, setSecili] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    students.forEach((s) => (m[s.id] = true));
    return m;
  });
  const [iptalNeden, setIptalNeden] = useState("");

  async function iptalEt() {
    setHata(null);
    setBilgi(null);
    setLoading(true);
    try {
      const r = await fetch("/api/trainings/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: session.id, neden: iptalNeden || null })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.hata ?? "İptal edilemedi.");
      setBilgi("Oturum iptal edildi.");
      window.location.href = "/antrenmanlar";
    } catch (e: any) {
      setHata(e?.message ?? "Hata");
    } finally {
      setLoading(false);
    }
  }

  async function duzenle() {
    setHata(null);
    setBilgi(null);
    const studentIds = Object.keys(secili).filter((k) => secili[k]);
    if (studentIds.length === 0) {
      setHata("En az 1 oyuncu seçmelisiniz.");
      return;
    }

    setLoading(true);
    try {
      const r = await fetch("/api/trainings/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: session.id, baslik, tarih, saat, konum, studentIds })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.hata ?? "Güncellenemedi.");
      setBilgi("Oturum güncellendi.");
      window.location.reload();
    } catch (e: any) {
      setHata(e?.message ?? "Hata");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className="btn-ghost" type="button" onClick={() => setModal("edit")} disabled={loading}>
        Düzenle
      </button>
      <button className="btn-ghost" type="button" onClick={() => setModal("cancel")} disabled={loading}>
        İptal Et
      </button>
      {bilgi && <span className="text-xs text-[color:var(--success)]">{bilgi}</span>}
      {hata && <span className="text-xs text-[color:var(--danger)]">{hata}</span>}

      <AnimatePresence>
        {modal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            initial={reduce ? undefined : { opacity: 0 }}
            animate={reduce ? undefined : { opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
          >
            <motion.div
              className="card card-neon p-6 w-full max-w-2xl"
              initial={reduce ? undefined : { y: 12, opacity: 0 }}
              animate={reduce ? undefined : { y: 0, opacity: 1 }}
              exit={reduce ? undefined : { y: 12, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {modal === "edit" ? (
                <div className="space-y-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="text-xl font-semibold">Antrenmanı Düzenle</div>
                      <div className="text-sm text-[color:var(--muted)] mt-1">Hızlı ve güvenli güncelleme</div>
                    </div>
                    <button className="btn-ghost" type="button" onClick={() => setModal(null)}>
                      Kapat
                    </button>
                  </div>

                  <div className="grid md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <label className="text-sm text-[color:var(--muted)]">Başlık</label>
                      <input className="input mt-1" value={baslik} onChange={(e) => setBaslik(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm text-[color:var(--muted)]">Tarih</label>
                      <input className="input mt-1" type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm text-[color:var(--muted)]">Saat</label>
                      <input className="input mt-1" type="time" value={saat} onChange={(e) => setSaat(e.target.value)} />
                    </div>
                    <div className="md:col-span-4">
                      <label className="text-sm text-[color:var(--muted)]">Konum</label>
                      <input className="input mt-1" value={konum} onChange={(e) => setKonum(e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <div className="font-semibold">Oyuncular</div>
                        <div className="text-sm text-[color:var(--muted)] mt-1">Arama + hızlı seç</div>
                      </div>
                      <input className="input" placeholder="Ara..." value={q} onChange={(e) => setQ(e.target.value)} />
                    </div>
                    <div className="mt-3 grid md:grid-cols-2 gap-2 max-h-[320px] overflow-auto pr-1">
                      {students
                        .filter((s) => (q ? s.ad_soyad.toLowerCase().includes(q.toLowerCase()) : true))
                        .map((s) => (
                          <label key={s.id} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-2">
                            <input
                              type="checkbox"
                              checked={!!secili[s.id]}
                              onChange={(e) => setSecili((m) => ({ ...m, [s.id]: e.target.checked }))}
                            />
                            <span className="truncate">{s.ad_soyad}</span>
                          </label>
                        ))}
                    </div>
                  </div>

                  {hata && <div className="text-sm text-[color:var(--danger)]">{hata}</div>}

                  <div className="flex justify-end gap-2">
                    <button className="btn-ghost" type="button" onClick={() => setModal(null)} disabled={loading}>
                      Vazgeç
                    </button>
                    <button
                      className="btn-primary"
                      type="button"
                      onClick={async () => {
                        await duzenle();
                      }}
                      disabled={loading}
                    >
                      Kaydet
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="text-xl font-semibold">Antrenmanı İptal Et</div>
                      <div className="text-sm text-[color:var(--muted)] mt-1">Silme yok; iptal edilir ve geçmiş korunur</div>
                    </div>
                    <button className="btn-ghost" type="button" onClick={() => setModal(null)}>
                      Kapat
                    </button>
                  </div>

                  <div>
                    <label className="text-sm text-[color:var(--muted)]">İptal nedeni (opsiyonel)</label>
                    <input className="input mt-1" value={iptalNeden} onChange={(e) => setIptalNeden(e.target.value)} />
                  </div>

                  {hata && <div className="text-sm text-[color:var(--danger)]">{hata}</div>}

                  <div className="flex justify-end gap-2">
                    <button className="btn-ghost" type="button" onClick={() => setModal(null)} disabled={loading}>
                      Vazgeç
                    </button>
                    <button
                      className="btn-primary"
                      type="button"
                      onClick={async () => {
                        await iptalEt();
                      }}
                      disabled={loading}
                    >
                      İptal Et
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
