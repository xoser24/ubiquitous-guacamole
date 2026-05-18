"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { motion, useReducedMotion } from "framer-motion";

type Session = { id: string; baslik: string; tarih: string; saat?: string | null; konum?: string | null };

function groupByDate(items: Session[]) {
  const map = new Map<string, Session[]>();
  for (const s of items) {
    const key = s.tarih;
    const arr = map.get(key) ?? [];
    arr.push(s);
    map.set(key, arr);
  }
  return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

export function TrainingsListClient({
  sessions,
  rol
}: {
  sessions: Session[];
  rol: "admin" | "antrenor" | "veli" | "ogrenci";
}) {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<"yaklasan" | "gecmis">("yaklasan");
  const [q, setQ] = useState("");

  const today = dayjs().format("YYYY-MM-DD");

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const base = (sessions ?? []).filter((s) => {
      const upcoming = s.tarih >= today;
      if (tab === "yaklasan" && !upcoming) return false;
      if (tab === "gecmis" && upcoming) return false;
      if (!qq) return true;
      const hay = `${s.baslik} ${s.konum ?? ""} ${s.tarih} ${s.saat ?? ""}`.toLowerCase();
      return hay.includes(qq);
    });
    // Yaklaşan: en yakın üstte, Geçmiş: en son üstte
    base.sort((a, b) => (tab === "yaklasan" ? (a.tarih > b.tarih ? 1 : -1) : a.tarih < b.tarih ? 1 : -1));
    return base;
  }, [sessions, q, tab, today]);

  const upcomingCount = useMemo(() => (sessions ?? []).filter((s) => s.tarih >= today).length, [sessions, today]);
  const pastCount = useMemo(() => (sessions ?? []).filter((s) => s.tarih < today).length, [sessions, today]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  return (
    <div className="space-y-4">
      <div className="card card-neon p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-semibold">Oturum Listesi</div>
            <div className="text-sm text-[color:var(--muted)] mt-1">Hızlı arama, sekmeler ve akıcı kart görünümü</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={tab === "yaklasan" ? "btn-primary" : "btn-ghost"} onClick={() => setTab("yaklasan")}>
              Yaklaşan <span className="opacity-70">({upcomingCount})</span>
            </button>
            <button className={tab === "gecmis" ? "btn-primary" : "btn-ghost"} onClick={() => setTab("gecmis")}>
              Geçmiş <span className="opacity-70">({pastCount})</span>
            </button>
          </div>
        </div>

        <div className="mt-4">
          <input className="input w-full" placeholder="Ara: başlık / konum / tarih..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="card card-neon p-6 text-[color:var(--muted)]">Kayıt bulunamadı.</div>
      ) : (
        <div className="space-y-4">
          {groups.map(([date, items]) => (
            <div key={date} className="space-y-2">
              <div className="text-xs text-[color:var(--muted)] px-2">{dayjs(date).format("DD MMM YYYY")} • {items.length} oturum</div>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                {items.map((s, idx) => (
                  <Link key={s.id} href={`/antrenmanlar/${s.id}`} className="block">
                    <motion.div
                      className="card card-neon card-neon-hover p-4 md:p-5 overflow-hidden relative"
                      initial={reduce ? undefined : { opacity: 0, y: 10 }}
                      animate={reduce ? undefined : { opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, delay: Math.min(0.2, idx * 0.03), ease: "easeOut" }}
                      whileHover={reduce ? undefined : { scale: 1.01 }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-base md:text-lg font-semibold truncate">{s.baslik}</div>
                          <div className="text-sm text-[color:var(--muted)] mt-1">
                            {s.tarih} • {s.saat ?? "-"} • {s.konum ?? "-"}
                          </div>
                        </div>
                        <span className="chip">{tab === "yaklasan" ? "Planlı" : "Tamamlandı"}</span>
                      </div>

                      {(rol === "admin" || rol === "antrenor") && (
                        <div className="mt-4 flex gap-2">
                          <span className="btn-ghost">Detay</span>
                          <span className="btn-primary">Yoklama</span>
                        </div>
                      )}
                    </motion.div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
