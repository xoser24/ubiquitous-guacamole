import { redirect } from "next/navigation";
import { girisZorunlu } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PaymentSubmitClient } from "@/components/finance/PaymentSubmitClient";

export default async function AidatPage() {
  const { user, profil } = await girisZorunlu();
  if (profil.rol !== "veli" && profil.rol !== "ogrenci") redirect("/yetkisiz");

  const admin = supabaseAdmin();

  const { data: myStudents } = await admin
    .from("students")
    .select("id, ad_soyad")
    .eq(profil.rol === "veli" ? "parent_id" : "student_user_id", user.id);
  const studentIds = (myStudents ?? []).map((s) => s.id);

  const { data: rows } = await admin
    .from("student_payments")
    .select("id, student_id, donem, gelir_kategorisi, tutar_toplam, tutar_odenen, son_odeme_tarihi, durum, students(ad_soyad)")
    .in("student_id", studentIds.length ? studentIds : ["00000000-0000-0000-0000-000000000000"])
    .order("son_odeme_tarihi", { ascending: false })
    .limit(200);

  const { data: subs } = await admin
    .from("payment_submissions")
    .select("id, student_payment_id, amount, status, created_at")
    .eq("payer_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const latestByPayment = new Map<string, any>();
  (subs ?? []).forEach((s: any) => {
    if (!latestByPayment.has(s.student_payment_id)) latestByPayment.set(s.student_payment_id, s);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Aidat Takibi</h1>
        <div className="text-sm text-[color:var(--muted)]">
          Borçlar, ödemeler ve dekont gönderimi (Admin onaylı)
        </div>
      </div>

      <div className="card card-neon p-6">
        {!rows || rows.length === 0 ? (
          <div className="text-[color:var(--muted)]">Kayıt bulunamadı.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-[color:var(--muted)]">
                <tr>
                  <th className="text-left py-2">Öğrenci</th>
                  <th className="text-left py-2">Dönem</th>
                  <th className="text-left py-2">Kategori</th>
                  <th className="text-left py-2">Toplam</th>
                  <th className="text-left py-2">Ödenen</th>
                  <th className="text-left py-2">Kalan</th>
                  <th className="text-left py-2">Son Tarih</th>
                  <th className="text-left py-2">Durum</th>
                  <th className="text-left py-2">Dekont</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-t border-white/10">
                    <td className="py-2">{r.students?.ad_soyad ?? "-"}</td>
                    <td className="py-2">{r.donem}</td>
                    <td className="py-2">{r.gelir_kategorisi}</td>
                    <td className="py-2">{Number(r.tutar_toplam).toLocaleString("tr-TR")} ₺</td>
                    <td className="py-2">{Number(r.tutar_odenen).toLocaleString("tr-TR")} ₺</td>
                    <td className="py-2">
                      {Math.max(0, Number(r.tutar_toplam) - Number(r.tutar_odenen ?? 0)).toLocaleString("tr-TR")} ₺
                    </td>
                    <td className="py-2">{r.son_odeme_tarihi}</td>
                    <td className="py-2">
                      <span className="chip">{r.durum}</span>
                    </td>
                    <td className="py-2">
                      {(() => {
                        const kalan = Math.max(0, Number(r.tutar_toplam) - Number(r.tutar_odenen ?? 0));
                        const latest = latestByPayment.get(r.id);
                        const pending = latest && latest.status === "pending";
                        if (kalan <= 0) return <span className="text-[color:var(--muted)]">—</span>;
                        return (
                          <div className="flex flex-wrap items-center gap-2">
                            <PaymentSubmitClient studentPaymentId={r.id} kalan={kalan} disabled={pending} />
                            {pending && <span className="text-xs text-[color:var(--muted)]">Onay bekliyor</span>}
                          </div>
                        );
                      })()}
                    </td>
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
