"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { Rol } from "@fa/shared";
import { getNavItems } from "@/lib/nav";

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="card card-neon card-neon-hover p-5">
      <div className="text-xs text-[color:var(--muted)]">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-[color:var(--muted)]">{hint}</div>
    </div>
  );
}

function QuickCard({
  href,
  title,
  desc,
  icon: Icon
}: {
  href: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link href={href} className="block">
      <motion.div
        className="card card-neon card-neon-hover p-5 h-full"
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
      >
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-2xl border flex items-center justify-center neon-icon">
            <Icon className="h-5 w-5 text-[color:var(--accent-a)]" />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-semibold leading-6">{title}</div>
            <div className="text-sm text-[color:var(--muted)] mt-1">{desc}</div>
          </div>
          <div className="flex-1" />
          <ArrowRight className="h-4 w-4 text-white/50 mt-1" />
        </div>
      </motion.div>
    </Link>
  );
}

function MenuCard({
  href,
  label,
  icon: Icon,
  desc
}: {
  href: string;
  label: string;
  desc?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link href={href} className="block">
      <motion.div
        className="card card-neon card-neon-hover p-5 h-full"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-2xl border flex items-center justify-center neon-icon">
            <Icon className="h-5 w-5 text-[color:var(--accent-a)]" />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-semibold leading-6">{label}</div>
            {desc && <div className="text-sm text-[color:var(--muted)] mt-1">{desc}</div>}
          </div>
          <div className="flex-1" />
          <ArrowRight className="h-4 w-4 text-white/50 mt-1" />
        </div>
      </motion.div>
    </Link>
  );
}

export function DashboardHomeClient({ rol }: { rol: Rol }) {
  const nav = getNavItems(rol).filter((n) => n.href !== "/");

  const descMap: Record<string, string> = {
    "/ogrenciler": "Oyuncu kartları, sağlık ve performans.",
    "/antrenmanlar": "Planlayıcı, takvim, oturum ve yoklama.",
    "/yoklama": "Tarih bazında yoklama geçmişi.",
    "/bildirimler": "Duyuru ve hatırlatmalar.",
    "/aidat": "Ödeme durumu ve son tarihler.",
    "/finans": "Gelir-gider, öğrenci ödemeleri.",
    "/admin": "Kullanıcı ve sistem yönetimi."
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="card card-neon p-6 overflow-hidden relative"
      >
        <div aria-hidden className="absolute -right-24 -top-24 h-56 w-56 rounded-full neon-dot" />
        <div aria-hidden className="absolute -left-24 -bottom-24 h-56 w-56 rounded-full neon-dot opacity-70" />

        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="min-w-0">
            <div className="text-xs text-[color:var(--muted)]">✨ Elite Dashboard</div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">
              Hoş geldiniz 👋
            </h1>
            <p className="text-sm text-[color:var(--muted)] mt-2 max-w-2xl">
              Hızlı menü kutucuklarından istediğiniz ekrana tek dokunuşla gidin.
            </p>
          </div>

          <div className="flex-1" />

          <div className="flex gap-2">
            <Link className="btn-primary" href={nav[0]?.href ?? "/antrenmanlar"}>
              Hızlı Başla
            </Link>
            <Link className="btn-ghost" href="/bildirimler">
              Bildirimler
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Veli/öğrenci ekranında üst metrik kutularını göstermiyoruz */}
      {rol !== "veli" && rol !== "ogrenci" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="📌 Aktif Öğrenci" value="—" hint="Yakında canlı sayı" />
          <Stat label="📅 Bu Hafta Antrenman" value="—" hint="Takvimden çekilecek" />
          <Stat label="✅ Yoklama Oranı" value="—" hint="Son 7 gün" />
          <Stat label="💰 Finans Durumu" value={rol === "admin" ? "—" : "Kısıtlı"} hint="Admin-only" />
        </div>
      )}

      <div>
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            <div className="text-xs text-[color:var(--muted)]">Hızlı Menü</div>
            <div className="text-lg font-semibold">Kutucuklar</div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {nav.map((n) => (
            <MenuCard key={n.href} href={n.href} label={n.label} icon={n.icon} desc={descMap[n.href]} />
          ))}
        </div>
      </div>
    </div>
  );
}
