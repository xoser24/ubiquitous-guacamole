import { redirect } from "next/navigation";
import { girisZorunlu } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { UserCreateClient } from "@/components/admin/UserCreateClient";

export default async function AdminKullanicilarPage() {
  const { profil } = await girisZorunlu();
  if (profil.rol !== "admin") redirect("/yetkisiz");

  const sb = await supabaseServer();
  const { data: users } = await sb
    .from("profiles")
    .select("id, rol, ad_soyad, telefon, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Kullanıcı Yönetimi</h1>
        <div className="text-sm text-[color:var(--muted)]">
          Kullanıcı oluşturma ve rol yönetimi
        </div>
      </div>

      <UserCreateClient />

      <div className="card card-neon p-6">
        <div className="font-semibold mb-3">Mevcut Kullanıcılar</div>
        {!users || users.length === 0 ? (
          <div className="text-[color:var(--muted)]">Kayıt yok.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-[color:var(--muted)]">
                <tr>
                  <th className="text-left py-2">Ad Soyad</th>
                  <th className="text-left py-2">Rol</th>
                  <th className="text-left py-2">Telefon</th>
                  <th className="text-left py-2">ID</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-white/10">
                    <td className="py-2">{u.ad_soyad}</td>
                    <td className="py-2">{u.rol}</td>
                    <td className="py-2">{u.telefon ?? "-"}</td>
                    <td className="py-2 text-xs text-[color:var(--muted)]">{u.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
