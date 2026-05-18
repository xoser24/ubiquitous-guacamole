"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Rol } from "@fa/shared";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Menu } from "lucide-react";
import { useMemo, useState } from "react";
import { getNavItems } from "@/lib/nav";

function NavItem({
  href,
  label,
  icon: Icon
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const p = usePathname();
  const aktif = p === href || (href !== "/" && p.startsWith(href));
  return (
    <Link
      href={href}
      className={clsx(
        "nav-item",
        aktif ? "nav-item-active" : "nav-item-idle"
      )}
    >
      <motion.span
        className="flex items-center gap-3 w-full"
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.99 }}
      >
      <Icon className={clsx("h-4 w-4", aktif ? "text-black" : "text-white/80")} />
      <span className="truncate">{label}</span>
      </motion.span>
    </Link>
  );
}

export function Shell({
  rol,
  adSoyad,
  children
}: {
  rol: Rol;
  adSoyad: string;
  children: React.ReactNode;
}) {
  const [mobilMenuAcik, setMobilMenuAcik] = useState(false);

  const nav = useMemo(() => {
    return getNavItems(rol);
  }, [rol]);

  async function cikisYap() {
    const sb = supabaseBrowser();
    await sb.auth.signOut();
    window.location.href = "/giris";
  }

  return (
    <div className="min-h-full">
      {/* Top bar (mobil + genel) */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <button
            className="icon-btn md:hidden"
            onClick={() => setMobilMenuAcik(true)}
            aria-label="Menü"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="inline-flex size-8 items-center justify-center rounded-xl bg-white/5 border border-white/10 overflow-hidden">
              <img src="/club-logo.svg" alt="Altınordu Spor Kulübü" className="h-6 w-6 object-contain" />
            </span>
            <span className="tracking-tight hidden sm:block">
              Altınordu <span className="text-[color:var(--gold)]">Spor Kulübü</span>
            </span>
            <span className="tracking-tight sm:hidden">
              Altınordu <span className="text-[color:var(--gold)]">SK</span>
            </span>
          </Link>

          <div className="flex-1" />

          <div className="hidden md:flex items-center gap-2">
            <span className="chip">✨ Elite Dashboard</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-right">
              <div className="text-sm leading-4">{adSoyad}</div>
              <div className="text-xs text-[color:var(--muted)]">
                {rol === "admin"
                  ? "Admin"
                  : rol === "antrenor"
                    ? "Antrenör"
                    : rol === "veli"
                      ? "Veli"
                      : "Öğrenci"}
              </div>
            </div>
            <button className="icon-btn" onClick={cikisYap} aria-label="Çıkış">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Layout: Sidebar + Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden md:block">
          <div className="glass rounded-3xl p-3 sticky top-[84px]">
            <div className="px-2 py-2">
              <div className="text-xs text-[color:var(--muted)]">Hızlı Menü</div>
              <div className="text-sm font-medium mt-1">🎯 Kontrol Paneli</div>
            </div>
            <div className="mt-2 grid gap-1">
              {nav.map((n) => (
                <NavItem key={n.href} href={n.href} label={n.label} icon={n.icon} />
              ))}
            </div>

            <div className="mt-3 px-2">
              <div className="card card-neon p-4">
                <div className="text-sm font-semibold">🚀 İpucu</div>
                <div className="text-xs text-[color:var(--muted)] mt-1">
                  Kartların üzerine gelince mikro animasyonlar devreye girer.
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile overlay sidebar */}
        <AnimatePresence>
          {mobilMenuAcik && (
            <motion.div
              className="fixed inset-0 z-30 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                className="absolute inset-0 bg-black/60"
                onClick={() => setMobilMenuAcik(false)}
              />
              <motion.div
                className="absolute left-0 top-0 bottom-0 w-[84%] max-w-xs glass p-3"
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -30, opacity: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              >
                <div className="px-2 py-2">
                  <div className="text-sm font-semibold">⚡ Menü</div>
                  <div className="text-xs text-[color:var(--muted)] mt-1">{adSoyad}</div>
                </div>
                <div className="mt-2 grid gap-1">
                  {nav.map((n) => (
                    <a
                      key={n.href}
                      href={n.href}
                      className="nav-item nav-item-idle"
                      onClick={() => setMobilMenuAcik(false)}
                    >
                      <n.icon className="h-4 w-4 text-white/80" />
                      <span className="truncate">{n.label}</span>
                    </a>
                  ))}
                </div>
                <div className="mt-3 px-2">
                  <button className="btn-ghost w-full" onClick={cikisYap}>
                    <span className="mr-2">🚪</span> Çıkış Yap
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <motion.main
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="min-w-0"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
