import { redirect } from "next/navigation";
import { girisZorunlu } from "@/lib/auth";
import { Shell } from "@/components/Shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profil } = await girisZorunlu();
  if (!profil) redirect("/giris");

  return (
    <Shell rol={profil.rol} adSoyad={profil.ad_soyad}>
      {children}
    </Shell>
  );
}

