"use client";

import dayjs from "dayjs";
import "dayjs/locale/tr";
import { useMemo, useState } from "react";
import Link from "next/link";

dayjs.locale("tr");

export function CalendarView({
  sessions
}: {
  sessions: { id: string; baslik: string; tarih: string }[];
}) {
  const [ay, setAy] = useState(dayjs().startOf("month"));
  const [seciliGun, setSeciliGun] = useState<string | null>(null);

  const map = useMemo(() => {
    const m = new Map<string, { id: string; baslik: string }[]>();
    sessions.forEach((s) => {
      const key = dayjs(s.tarih).format("YYYY-MM-DD");
      const arr = m.get(key) ?? [];
      arr.push({ id: s.id, baslik: s.baslik });
      m.set(key, arr);
    });
    return m;
  }, [sessions]);

  const days = useMemo(() => {
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
    <div className="card card-neon p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Takvim</div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost" onClick={() => setAy(ay.subtract(1, "month"))}>
            Önceki
          </button>
          <div className="text-sm text-[color:var(--muted)] min-w-28 md:min-w-36 text-center">
            {ay.format("MMMM YYYY")}
          </div>
          <button className="btn-ghost" onClick={() => setAy(ay.add(1, "month"))}>
            Sonraki
          </button>
        </div>
      </div>

      {/* Mobil: ay içi agenda (kullanışlı) */}
      <div className="md:hidden space-y-2">
        <div className="text-xs text-[color:var(--muted)]">Gün gün liste</div>
        {monthDays
          .map((d) => {
            const key = d.format("YYYY-MM-DD");
            const items = map.get(key) ?? [];
            return { d, key, items };
          })
          .filter((x) => x.items.length > 0)
          .map(({ d, key, items }) => (
            <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <button
                className="w-full flex items-center justify-between"
                type="button"
                onClick={() => setSeciliGun(seciliGun === key ? null : key)}
              >
                <div className="text-sm font-semibold">{d.format("DD MMM ddd")}</div>
                <span className="chip">{items.length} oturum</span>
              </button>
              {seciliGun === key && (
                <div className="mt-2 space-y-2">
                  {items.map((s) => (
                    <Link
                      key={s.id}
                      href={`/antrenmanlar/${s.id}`}
                      className="block rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 hover:border-[color:var(--accent-a)]/25 transition p-3"
                    >
                      <div className="font-semibold">{s.baslik}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        {monthDays.every((d) => (map.get(d.format("YYYY-MM-DD")) ?? []).length === 0) && (
          <div className="text-[color:var(--muted)]">Bu ay için planlı oturum yok.</div>
        )}
      </div>

      {/* Desktop/Tablet: klasik ay görünümü */}
      <div className="hidden md:grid grid-cols-7 gap-2 text-xs text-[color:var(--muted)]">
        {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((d) => (
          <div key={d} className="text-center">
            {d}
          </div>
        ))}
      </div>

      <div className="hidden md:grid grid-cols-7 gap-2">
        {days.map((d) => {
          const inMonth = d.month() === ay.month();
          const key = d.format("YYYY-MM-DD");
          const items = map.get(key) ?? [];
          return (
            <div
              key={key}
              className={`rounded-xl border p-2 min-h-24 ${
                inMonth ? "border-white/10 bg-white/5" : "border-white/5 bg-black/10 opacity-60"
              }`}
            >
              <div className="text-xs text-[color:var(--muted)]">{d.format("D")}</div>
              <div className="mt-1 space-y-1">
                {items.slice(0, 2).map((s) => (
                  <Link
                    key={s.id}
                    href={`/antrenmanlar/${s.id}`}
                    className="block text-xs rounded-lg bg-[color:var(--accent-a)]/15 border border-[color:var(--accent-a)]/25 px-2 py-1 hover:bg-[color:var(--accent-a)]/20 transition"
                  >
                    {s.baslik}
                  </Link>
                ))}
                {items.length > 2 && (
                  <div className="text-xs text-[color:var(--muted)]">+{items.length - 2} daha</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
