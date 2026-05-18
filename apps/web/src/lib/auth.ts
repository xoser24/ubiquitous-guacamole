import { redirect } from "next/navigation";
import type { Rol } from "@fa/shared";
import { supabaseServer } from "./supabase/server";

export type Profil = {
  id: string;
  rol: Rol;
  ad_soyad: string;
  telefon: string | null;
};

export async function oturumVeProfilGetir() {
  const supabase = await supabaseServer();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return { user: null, profil: null as Profil | null };

  const { data: profil } = await supabase
    .from("profiles")
    .select("id, rol, ad_soyad, telefon")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profil: (profil as any) as Profil | null };
}

export async function girisZorunlu() {
  const { user, profil } = await oturumVeProfilGetir();
  if (!user) redirect("/giris");
  if (!profil) redirect("/giris");
  return { user, profil: profil! };
}

export function rolGerekli(rol: Rol, izinli: Rol[]) {
  return izinli.includes(rol);
}
