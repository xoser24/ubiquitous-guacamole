"use client";

import dayjs from "dayjs";
import "dayjs/locale/tr";
import Link from "next/link";
import { useMemo, useState } from "react";

dayjs.locale("tr");

export function WeekPlannerView({
  sessions,
  onSelectDate
}: {
  sessions: { id: string; baslik: string; tarih: string; saat?: string | null; konum?: string | null }[];
  onSelectDate: (isoDate: string) => void;
}) {
  const [week, setWeek] = useState(dayjs().startOf("week"));

  const grouped = useMemo(() => {
    const m = new Map<string, typeof sessions>();
    sessions.forEach((s) => {
      const key = dayjs(s.tarih).format("YYYY-MM-DD");
      const arr = m.get(key) ?? [];
      arr.push(s);
      m.set(key, arr);
    });
    // her gün içindeki oturumları saate göre sırala
    m.forEach((arr, key) => {
      arr.sort((a, b) => String(a.saat ?? "").localeCompare(String(b.saat ?? "")));
      m.set(key, arr);
    });
    return m;
  }, [sessions]);

  const days = useMemo(() => {
    const out: dayjs.Dayjs[] = [];
    let d = week;
    for (let i = 0; i < 7; i++) {
      out.push(d);
      d = d.add(1, "day");
    }
    return out;
  }, [week]);

  return (
    <div className="card card-neon p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold">Planlayıcı (Haftalık)</div>
          <div className="text-sm text-[color:var(--muted)]">
            Haftayı gör, oturumları düzenle ve tek tıkla yeni oturum planla.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost" onClick={() => setWeek(week.subtract(1, "week"))}>
            Önceki Hafta
          </button>
          <div className="text-sm text-[color:var(--muted)] min-w-32 md:min-w-44 text-center">
            {week.format("D MMM")} - {week.add(6, "day").format("D MMM YYYY")}
          </div>
          <button className="btn-ghost" onClick={() => setWeek(week.add(1, "week"))}>
            Sonraki Hafta
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-7 gap-3">
        {days.map((d) => {
          const key = d.format("YYYY-MM-DD");
          const items = grouped.get(key) ?? [];
          return (
            <div
              key={key}
              className="rounded-2xl border border-white/10 bg-white/5 p-3 min-h-28 md:min-h-48 hover:border-[color:var(--accent-a)]/20 transition"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-[color:var(--muted)]">{d.format("ddd")}</div>
                  <div className="font-semibold">{d.format("D")}</div>
                </div>
                <button className="btn-ghost px-3 py-2" type="button" onClick={() => onSelectDate(key)}>
                  ➕
                </button>
              </div>

              <div className="mt-2 space-y-2">
                {items.length === 0 ? (
                  <div className="text-xs text-[color:var(--muted)]">Boş</div>
                ) : (
                  items.map((s) => (
                    <Link
                      key={s.id}
                      href={`/antrenmanlar/${s.id}`}
                      className="block rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 hover:border-[color:var(--accent-a)]/25 transition p-2"
                    >
                      <div className="text-xs text-[color:var(--muted)]">
                        {(s.saat ?? "--:--")} • {s.konum ?? "Konum yok"}
                      </div>
                      <div className="text-sm font-medium truncate">{s.baslik}</div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
