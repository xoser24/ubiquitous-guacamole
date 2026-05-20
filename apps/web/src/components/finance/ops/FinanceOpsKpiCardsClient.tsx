"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { animate } from "framer-motion";

function useCountUp(value: number, duration = 0.6, reduceMotion?: boolean | null) {
  const [n, setN] = useState(0);

  useEffect(() => {
    const target = Math.round(value ?? 0);
    if (reduceMotion) {
      setN(target);
      return;
    }

    const controls = animate(0, target, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => setN(Math.round(latest))
    });
    return () => controls.stop();
  }, [value, duration, reduceMotion]);

  return n;
}

export function FinanceOpsKpiCardsClient({
  kpis
}: {
  kpis: {
    gelir: number;
    gider: number;
    net: number;
    gecikmisAlacak: number;
    tahsilatOrani: number;
    riskliVeliler: number;
  };
}) {
  const reduce = useReducedMotion();
  const gelir = useCountUp(kpis.gelir ?? 0, 0.6, reduce);
  const gider = useCountUp(kpis.gider ?? 0, 0.6, reduce);
  const net = useCountUp(kpis.net ?? 0, 0.6, reduce);
  const overdue = useCountUp(kpis.gecikmisAlacak ?? 0, 0.6, reduce);
  const oran = useCountUp(kpis.tahsilatOrani ?? 0, 0.5, reduce);
  const risk = useCountUp(kpis.riskliVeliler ?? 0, 0.5, reduce);

  const cards = useMemo(
    () => [
      {
        title: "💰 Toplam Gelir",
        value: gelir,
        suffix: " ₺",
        tone: "emerald"
      },
      {
        title: "💸 Toplam Gider",
        value: gider,
        suffix: " ₺",
        tone: "red"
      },
      {
        title: "📈 Net Kazanç",
        value: net,
        suffix: " ₺",
        tone: "gold"
      },
      {
        title: "🔴 Gecikmiş Alacak",
        value: overdue,
        suffix: " ₺",
        tone: "danger"
      },
      {
        title: "🟢 Tahsilat Oranı",
        value: oran,
        suffix: " %",
        tone: "cyan"
      },
      {
        title: "⚠️ Riskli Veliler",
        value: risk,
        suffix: "",
        tone: "amber"
      }
    ],
    [gelir, gider, net, overdue, oran, risk]
  );

  const toneClass = (tone: string) => {
    switch (tone) {
      case "emerald":
        return "border-emerald-400/20 hover:shadow-[0_0_30px_rgba(34,197,94,.12)]";
      case "red":
        return "border-red-500/20 hover:shadow-[0_0_30px_rgba(239,68,68,.12)]";
      case "danger":
        return "border-red-500/25 hover:shadow-[0_0_40px_rgba(239,68,68,.14)]";
      case "cyan":
        return "border-cyan-300/20 hover:shadow-[0_0_30px_rgba(34,211,238,.14)]";
      case "amber":
        return "border-amber-300/20 hover:shadow-[0_0_30px_rgba(251,191,36,.12)]";
      default:
        return "border-[color:var(--gold)]/20 hover:shadow-[0_0_36px_rgba(212,175,55,.12)]";
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="font-semibold">KPI Kartları</div>
          <div className="text-sm text-[color:var(--muted)] mt-1">3 saniyede finans fotoğrafı.</div>
        </div>
        <div className="chip">Büyük kartlar • Mobil uyumlu</div>
      </div>

      {/* Desktop: grid, Mobile: swipe */}
      <div className="hidden lg:grid grid-cols-3 gap-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.title}
            className={`card card-neon card-neon-hover p-6 border ${toneClass(c.tone)}`}
            initial={reduce ? undefined : { opacity: 0, y: 10 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.03, ease: "easeOut" }}
          >
            <div className="text-xs text-[color:var(--muted)]">{c.title}</div>
            <motion.div className="mt-2 text-3xl font-semibold tabular-nums text-[color:var(--gold)]">
              {c.value}
              <span className="text-base font-medium text-[color:var(--muted)]">{c.suffix}</span>
            </motion.div>
            <div className="mt-3 h-[1px] w-full bg-gradient-to-r from-[color:var(--gold)]/50 to-transparent" />
            <div className="text-xs text-[color:var(--muted)] mt-3">Bu ay toplam.</div>
          </motion.div>
        ))}
      </div>

      <div className="lg:hidden -mx-4 px-4 overflow-x-auto">
        <div className="flex gap-3 min-w-max snap-x snap-mandatory pb-2">
          {cards.map((c, i) => (
            <motion.div
              key={c.title}
              className={`card card-neon p-5 border ${toneClass(c.tone)} w-[78vw] max-w-[360px] snap-start`}
              initial={reduce ? undefined : { opacity: 0, y: 10 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.03, ease: "easeOut" }}
            >
              <div className="text-xs text-[color:var(--muted)]">{c.title}</div>
              <motion.div className="mt-2 text-3xl font-semibold tabular-nums text-[color:var(--gold)]">
                {c.value}
                <span className="text-base font-medium text-[color:var(--muted)]">{c.suffix}</span>
              </motion.div>
              <div className="mt-3 h-[1px] w-full bg-gradient-to-r from-[color:var(--gold)]/50 to-transparent" />
              <div className="text-xs text-[color:var(--muted)] mt-3">Bu ay toplam.</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
