import { redirect } from "next/navigation";
import { girisZorunlu } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { FinanceClient } from "@/components/finance/FinanceClient";

export default async function FinansDefterPage() {
  const { profil } = await girisZorunlu();
  if (profil.rol !== "admin") redirect("/yetkisiz");

  const sb = await supabaseServer();

  const [{ data: students }, { data: tx }, { data: sp }] = await Promise.all([
    sb.from("students").select("id, ad_soyad").order("ad_soyad", { ascending: true }),
    sb.from("financial_transactions").select("*").eq("iptal", false).order("tarih", { ascending: false }).limit(1000),
    sb.from("student_payments").select("*").eq("iptal", false).order("created_at", { ascending: false }).limit(1500)
  ]);

  return (
    <div className="space-y-6">
      <div className="card card-neon p-6">
        <div className="text-2xl font-semibold">💰 Gelir / Gider</div>
        <div className="text-sm text-[color:var(--muted)] mt-1">
          Aylık özet, grafikler ve immutable defter kayıtları
        </div>
      </div>

      <FinanceClient
        students={(students ?? []) as any}
        initialTransactions={(tx ?? []) as any}
        initialStudentPayments={(sp ?? []) as any}
      />
    </div>
  );
}
