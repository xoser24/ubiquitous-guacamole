"use client";

import dayjs from "dayjs";
import "dayjs/locale/tr";
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

dayjs.locale("tr");

type Session = {
  id: string;
  baslik: string;
  tarih: string; // YYYY-MM-DD
  saat?: string | null; // HH:mm veya HH:mm:ss
  konum?: string | null;
  coach_ad_soyad?: string | null;
};

function fmtTime(t?: string | null) {
  if (!t) return "—";
  // 18:00:00 -> 18:00
  return String(t).slice(0, 5);
}

export function ParentMonthlyCalendarClient({ sessions }: { sessions: Session[] }) {
  const reduce = useReducedMotion();
  const [ay, setAy] = useState(dayjs().startOf("month"));
  const [selected, setSelected] = useState<Session | null>(null);

  const sessionsByDay = useMemo(() => {
    const m = new Map<string, Session[]>();
    (sessions ?? []).forEach((s) => {
      const key = dayjs(s.tarih).format("YYYY-MM-DD");
      const arr = m.get(key) ?? [];
      arr.push(s);
      m.set(key, arr);
    });
    // her gün içini saate göre sırala
    m.forEach((arr, key) => {
      arr.sort((a, b) => fmtTime(a.saat).localeCompare(fmtTime(b.saat)));
      m.set(key, arr);
    });
    return m;
  }, [sessions]);

  const daysGrid = useMemo(() => {
    const start = ay.startOf("week");
    const end = ay.endOf("month").endOf("week");
    const out: dayjs.Dayjs[] = [];
    let d = start;
    while (d.isBefore(end) || d.isSame(end, "day")) {
      out.push(d);
      d = d.add(1, "day");
    }
    return out;
  }, [ay]);

  const monthDays = useMemo(() => {
    const start = ay.startOf("month");
    const end = ay.endOf("month");
    const out: dayjs.Dayjs[] = [];
    let d = start;
    while (d.isBefore(end) || d.isSame(end, "day")) {
      out.push(d);
      d = d.add(1, "day");
    }
    return out;
  }, [ay]);

  return (
    <div className="space-y-4">
      <div className="card card-neon p-4 md:p-6 overflow-hidden relative">
        <div aria-hidden className="absolute -right-24 -top-24 h-64 w-64 rounded-full neon-dot opacity-70 pointer-events-none" />
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-[color:var(--muted)]">📅 Aylık Takvim</div>
            <div className="text-2xl font-semibold mt-1">{ay.format("MMMM YYYY")}</div>
            <div className="text-sm text-[color:var(--muted)] mt-1">
              Antrenmanları gör, üzerine tıkla ve detayını incele.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost" type="button" onClick={() => setAy(ay.subtract(1, "month"))}>
              Önceki
            </button>
            <button className="btn-ghost" type="button" onClick={() => setAy(dayjs().startOf("month"))}>
              Bugün
            </button>
            <button className="btn-ghost" type="button" onClick={() => setAy(ay.add(1, "month"))}>
              Sonraki
            </button>
          </div>
        </div>
      </div>

      {/* Mobil: agenda */}
      <div className="md:hidden space-y-2">
        {monthDays
          .map((d) => {
            const key = d.format("YYYY-MM-DD");
            const items = sessionsByDay.get(key) ?? [];
            return { d, key, items };
          })
          .filter((x) => x.items.length > 0)
          .map(({ d, key, items }) => (
            <div key={key} className="card card-neon p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{d.format("DD MMM ddd")}</div>
                <span className="chip">{items.length} oturum</span>
              </div>
              <div className="mt-3 space-y-2">
                {items.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelected(s)}
                    className="w-full text-left rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 hover:border-[color:var(--accent-a)]/25 transition p-3"
                  >
                    <div className="text-xs text-[color:var(--muted)]">
                      {fmtTime(s.saat)} • {s.konum ?? "Konum yok"} • {s.coach_ad_soyad ?? "Antrenör"}
                    </div>
                    <div className="font-semibold">{s.baslik}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}

        {monthDays.every((d) => (sessionsByDay.get(d.format("YYYY-MM-DD")) ?? []).length === 0) && (
          <div className="card card-neon p-6 text-[color:var(--muted)]">Bu ay için planlı antrenman yok.</div>
        )}
      </div>

      {/* Desktop/Tablet: ay grid */}
      <div className="hidden md:block card card-neon p-6">
        <div className="grid grid-cols-7 gap-2 text-xs text-[color:var(--muted)] mb-2">
          {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((d) => (
            <div key={d} className="text-center">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {daysGrid.map((d, idx) => {
            const inMonth = d.month() === ay.month();
            const key = d.format("YYYY-MM-DD");
            const items = sessionsByDay.get(key) ?? [];
            return (
              <motion.div
                key={key}
                className={`rounded-xl border p-2 min-h-28 ${
                  inMonth ? "border-white/10 bg-white/5" : "border-white/5 bg-black/10 opacity-60"
                }`}
                initial={reduce ? undefined : { opacity: 0, y: 8 }}
                animate={reduce ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: Math.min(0.18, idx * 0.01), ease: "easeOut" }}
              >
                <div className="text-xs text-[color:var(--muted)]">{d.format("D")}</div>
                <div className="mt-1 space-y-1">
                  {items.slice(0, 3).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelected(s)}
                      className="w-full text-left text-xs rounded-lg bg-[color:var(--accent-a)]/15 border border-[color:var(--accent-a)]/25 px-2 py-1 hover:bg-[color:var(--accent-a)]/20 transition"
                      title={`${fmtTime(s.saat)} • ${s.konum ?? ""} • ${s.coach_ad_soyad ?? ""}`}
                    >
                      <span className="opacity-80">{fmtTime(s.saat)}</span> <span className="font-medium">{s.baslik}</span>
                    </button>
                  ))}
                  {items.length > 3 && <div className="text-xs text-[color:var(--muted)]">+{items.length - 3} daha</div>}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Detay modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            initial={reduce ? undefined : { opacity: 0 }}
            animate={reduce ? undefined : { opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
          >
            <motion.div
              className="card card-neon p-6 w-full max-w-lg"
              initial={reduce ? undefined : { y: 12, opacity: 0 }}
              animate={reduce ? undefined : { y: 0, opacity: 1 }}
              exit={reduce ? undefined : { y: 12, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-[color:var(--muted)]">Antrenman Detayı</div>
                  <div className="text-xl font-semibold mt-1">{selected.baslik}</div>
                </div>
                <button className="btn-ghost" type="button" onClick={() => setSelected(null)}>
                  Kapat
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-[color:var(--muted)]">Tarih</div>
                  <div className="font-semibold mt-1">{dayjs(selected.tarih).format("DD MMM YYYY")}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-[color:var(--muted)]">Saat</div>
                  <div className="font-semibold mt-1">{fmtTime(selected.saat)}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 col-span-2">
                  <div className="text-xs text-[color:var(--muted)]">Konum</div>
                  <div className="font-semibold mt-1">{selected.konum ?? "—"}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 col-span-2">
                  <div className="text-xs text-[color:var(--muted)]">Antrenör</div>
                  <div className="font-semibold mt-1">{selected.coach_ad_soyad ?? "—"}</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

