"use client";

import dayjs from "dayjs";
import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";

type Tx = {
  id: string;
  tur: "gelir" | "gider";
  kategori: string;
  tutar: number;
  tarih: string;
  aciklama?: string | null;
  student_id?: string | null;
  created_at?: string;
};

function fmtMoney(n: number) {
  return Number(n ?? 0).toLocaleString("tr-TR");
}

function icon(t: Tx) {
  if (t.tur === "gelir") return "🟢";
  return "🔴";
}

export function FinanceOpsTimelineClient({
  transactions,
  studentNameMap
}: {
  transactions: Tx[];
  studentNameMap: Map<string, string>;
}) {
  const reduce = useReducedMotion();
  const [filter, setFilter] = useState<"hepsi" | "gelir" | "gider">("hepsi");

  const list = useMemo(() => {
    const base = (transactions ?? []).slice(0, 30);
    if (filter === "hepsi") return base;
    return base.filter((t) => t.tur === filter);
  }, [transactions, filter]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-semibold">Son Finans Hareketleri</div>
          <div className="text-sm text-[color:var(--muted)] mt-1">Temiz timeline / feed görünümü.</div>
        </div>
        <div className="flex gap-2">
          <button className={filter === "hepsi" ? "btn-primary" : "btn-ghost"} onClick={() => setFilter("hepsi")} type="button">
            Hepsi
          </button>
          <button className={filter === "gelir" ? "btn-primary" : "btn-ghost"} onClick={() => setFilter("gelir")} type="button">
            Gelir
          </button>
          <button className={filter === "gider" ? "btn-primary" : "btn-ghost"} onClick={() => setFilter("gider")} type="button">
            Gider
          </button>
        </div>
      </div>

      <div className="card card-neon p-6">
        {list.length === 0 ? (
          <div className="text-[color:var(--muted)]">Kayıt yok.</div>
        ) : (
          <div className="space-y-2">
            {list.map((t, i) => {
              const student = t.student_id ? studentNameMap.get(t.student_id) : null;
              const when = t.created_at ? dayjs(t.created_at).format("DD.MM HH:mm") : dayjs(t.tarih).format("DD.MM");
              const headline =
                t.tur === "gelir"
                  ? `${student ? `${student} • ` : ""}${t.kategori} — ₺${fmtMoney(t.tutar)}`
                  : `${t.kategori} — ₺${fmtMoney(t.tutar)}`;

              return (
                <motion.div
                  key={t.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  initial={reduce ? undefined : { opacity: 0, y: 6 }}
                  animate={reduce ? undefined : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(0.12, i * 0.01), ease: "easeOut" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {icon(t)} {headline}
                      </div>
                      <div className="text-xs text-[color:var(--muted)] mt-1">
                        {when}
                        {t.aciklama ? ` • ${t.aciklama}` : ""}
                      </div>
                    </div>
                    <span className="chip">{t.tur}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

