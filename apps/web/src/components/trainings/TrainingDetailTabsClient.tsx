"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { AttendanceClient } from "@/components/trainings/AttendanceClient";

type Student = { id: string; ad_soyad: string; yas_grubu: string };

export function TrainingDetailTabsClient({
  trainingSessionId,
  session,
  students,
  initialMap,
  canEdit
}: {
  trainingSessionId: string;
  session: { baslik: string; tarih: string; saat: string; konum: string; iptal?: boolean | null };
  students: Student[];
  initialMap: Record<string, any>;
  canEdit: boolean;
}) {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<"yoklama" | "oyuncular" | "detay">("yoklama");
  const [q, setQ] = useState("");

  const roster = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return students;
    return students.filter((s) => `${s.ad_soyad} ${s.yas_grubu}`.toLowerCase().includes(qq));
  }, [students, q]);

  function TabButton({ id, children }: any) {
    const active = tab === id;
    return (
      <button className={active ? "btn-primary" : "btn-ghost"} type="button" onClick={() => setTab(id)}>
        {children}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <TabButton id="yoklama">✅ Yoklama</TabButton>
        <TabButton id="oyuncular">👥 Oyuncular</TabButton>
        <TabButton id="detay">ℹ️ Oturum Detayı</TabButton>
      </div>

      <AnimatePresence mode="wait">
        {tab === "yoklama" && (
          <motion.div
            key="yoklama"
            initial={reduce ? undefined : { opacity: 0, y: 8 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: 8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <AttendanceClient trainingSessionId={trainingSessionId} students={students} initialMap={initialMap} canEdit={canEdit} />
          </motion.div>
        )}

        {tab === "oyuncular" && (
          <motion.div
            key="oyuncular"
            initial={reduce ? undefined : { opacity: 0, y: 8 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: 8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <div className="card card-neon p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="font-semibold">Oyuncu Listesi</div>
                  <div className="text-sm text-[color:var(--muted)] mt-1">Hızlı arama + mevcut yoklama durumu</div>
                </div>
                <input className="input" placeholder="Ara..." value={q} onChange={(e) => setQ(e.target.value)} />
              </div>

              <div className="mt-4 grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                {roster.map((s) => {
                  const durum = initialMap?.[s.id]?.durum ?? initialMap?.[s.id] ?? "gelmedi";
                  const chip = durum === "geldi" ? "🟢 geldi" : durum === "izinli" ? "🟡 izinli" : "🔴 gelmedi";
                  return (
                    <div key={s.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{s.ad_soyad}</div>
                          <div className="text-sm text-[color:var(--muted)] mt-1">{s.yas_grubu}</div>
                        </div>
                        <span className="chip">{chip}</span>
                      </div>
                    </div>
                  );
                })}
                {roster.length === 0 && <div className="text-[color:var(--muted)]">Kayıt yok.</div>}
              </div>
            </div>
          </motion.div>
        )}

        {tab === "detay" && (
          <motion.div
            key="detay"
            initial={reduce ? undefined : { opacity: 0, y: 8 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: 8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <div className="card card-neon p-6">
              <div className="font-semibold">Oturum Detayı</div>
              <div className="text-sm text-[color:var(--muted)] mt-1">Hızlı bilgi kartı</div>

              <div className="mt-4 grid md:grid-cols-4 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-[color:var(--muted)]">Başlık</div>
                  <div className="font-semibold mt-1">{session.baslik}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-[color:var(--muted)]">Tarih</div>
                  <div className="font-semibold mt-1">{session.tarih}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-[color:var(--muted)]">Saat</div>
                  <div className="font-semibold mt-1">{session.saat}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-[color:var(--muted)]">Konum</div>
                  <div className="font-semibold mt-1">{session.konum}</div>
                </div>
              </div>

              {session.iptal && (
                <div className="mt-4 text-sm text-[color:var(--danger)]">Bu oturum iptal edilmiş.</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

