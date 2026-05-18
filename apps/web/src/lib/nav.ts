import type { Rol } from "@fa/shared";
import type { ComponentType } from "react";
import { Bell, Dumbbell, Home, ListChecks, MessageCircle, Shield, Users, Wallet } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

export function getNavItems(rol: Rol): NavItem[] {
  // Veli ekranı: sadece öğrenci kartı + aidat + antrenman günleri
  if (rol === "veli") {
    return [
      { href: "/", label: "🏠 Ana Sayfa", icon: Home },
      { href: "/ogrenciler", label: "🧒 Öğrencim", icon: Users },
      { href: "/antrenmanlar", label: "🏋️ Antrenman Günleri", icon: Dumbbell },
      { href: "/aidat", label: "💳 Aidat Takibi", icon: Wallet },
      { href: "/whatsapp", label: "📲 WhatsApp", icon: MessageCircle }
    ];
  }

  // Öğrenci ekranı: öğrenci profili + aidat + antrenman günleri
  if (rol === "ogrenci") {
    return [
      { href: "/", label: "🏠 Ana Sayfa", icon: Home },
      { href: "/ogrenciler", label: "🧒 Profilim", icon: Users },
      { href: "/antrenmanlar", label: "🏋️ Antrenman Günleri", icon: Dumbbell },
      { href: "/aidat", label: "💳 Aidat Takibi", icon: Wallet }
    ];
  }

  const base: NavItem[] = [
    { href: "/", label: "🏠 Ana Sayfa", icon: Home },
    { href: "/ogrenciler", label: "👥 Öğrenciler", icon: Users },
    { href: "/antrenmanlar", label: "🏋️ Antrenmanlar", icon: Dumbbell },
    { href: "/yoklama", label: "📋 Yoklama", icon: ListChecks },
    { href: "/bildirimler", label: "🔔 Bildirimler", icon: Bell }
  ];

  if (rol === "admin") {
    base.push({ href: "/finans", label: "💳 Finans", icon: Wallet });
    base.push({ href: "/admin", label: "🛡️ Admin", icon: Shield });
  }

  return base;
}
