"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { FinanceOpsLedgerModalClient } from "@/components/finance/ops/FinanceOpsLedgerModalClient";

export function FinanceOpsQuickActionsFabClient({ monthKey }: { monthKey: string }) {
  const [open, setOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState<null | "gelir" | "gider">(null);

  return (
    <>
      <FinanceOpsLedgerModalClient open={ledgerOpen === "gelir"} onClose={() => setLedgerOpen(null)} initialTur="gelir" />
      <FinanceOpsLedgerModalClient open={ledgerOpen === "gider"} onClose={() => setLedgerOpen(null)} initialTur="gider" />

      <div className="fixed bottom-5 right-5 z-50">
        <AnimatePresence>
          {open && (
            <motion.div
              className="mb-3 w-[280px] rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-3 shadow-[0_18px_50px_rgba(0,0,0,.55)]"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <div className="text-xs text-[color:var(--muted)] px-1 pb-2">Hızlı İşlemler • {monthKey}</div>
              <div className="grid gap-2">
                <button className="btn-primary" type="button" onClick={() => setLedgerOpen("gelir")}>
                  + Gelir Ekle
                </button>
                <button className="btn-primary" type="button" onClick={() => setLedgerOpen("gider")}>
                  + Gider Ekle
                </button>
                <a className="btn-ghost text-center" href="/finans/aidat">
                  + Aidat Ekle / Düzenle
                </a>
                <a className="btn-ghost text-center" href="/finans/hatirlatmalar">
                  + Toplu Hatırlatma
                </a>
                <a className="btn-ghost text-center" href="/whatsapp">
                  + WhatsApp Gönder
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          className="rounded-full border border-[color:var(--gold)]/35 bg-[color:var(--gold)] text-black shadow-[0_18px_50px_rgba(212,175,55,.18)] px-5 py-4 font-semibold"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Kapat" : "Hızlı"}
        </button>
      </div>
    </>
  );
}
