"use client";

import { motion, useReducedMotion } from "framer-motion";

export function FinanceOpsAlertsClient({
  alerts
}: {
  alerts: { title: string; desc: string; tone: "danger" | "warn" | "info" | "ok" }[];
}) {
  const reduce = useReducedMotion();

  const tone = (t: string) => {
    switch (t) {
      case "danger":
        return "border-red-500/25 bg-red-500/10";
      case "warn":
        return "border-amber-400/25 bg-amber-400/10";
      case "info":
        return "border-cyan-300/25 bg-cyan-300/10";
      default:
        return "border-emerald-400/20 bg-emerald-400/10";
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="font-semibold">Finans Uyarıları</div>
          <div className="text-sm text-[color:var(--muted)] mt-1">AI-like içgörüler (otomatik hesap).</div>
        </div>
        <div className="chip">Operasyon odaklı</div>
      </div>

      <div className="grid lg:grid-cols-4 gap-3">
        {alerts.map((a, i) => (
          <motion.div
            key={a.title}
            className={`rounded-2xl border ${tone(a.tone)} p-4`}
            initial={reduce ? undefined : { opacity: 0, y: 10 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.03, ease: "easeOut" }}
          >
            <div className="font-semibold">{a.title}</div>
            <div className="text-xs text-[color:var(--muted)] mt-2 leading-relaxed">{a.desc}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

