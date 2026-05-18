import { redirect } from "next/navigation";
import { girisZorunlu } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { StudentCreateForm } from "@/components/admin/StudentCreateForm";

export default async function AdminOgrenciOlusturPage() {
  const { profil } = await girisZorunlu();
  if (profil.rol !== "admin") redirect("/yetkisiz");

  const sb = await supabaseServer();
  const { data: antrenorler } = await sb
    .from("profiles")
    .select("id, ad_soyad")
    .eq("rol", "antrenor")
    .order("ad_soyad", { ascending: true });

  const { data: veliler } = await sb
    .from("profiles")
    .select("id, ad_soyad")
    .eq("rol", "veli")
    .order("ad_soyad", { ascending: true });

  const { data: ogrenciler } = await sb
    .from("profiles")
    .select("id, ad_soyad")
    .eq("rol", "ogrenci")
    .order("ad_soyad", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Yeni Öğrenci Oluştur</h1>
        <div className="text-sm text-[color:var(--muted)]">
          Öğrenciyi antrenör ve veli hesabına bağlayın.
        </div>
      </div>

      <StudentCreateForm
        antrenorler={antrenorler ?? []}
        veliler={veliler ?? []}
        ogrenciHesaplari={ogrenciler ?? []}
      />
    </div>
  );
}

