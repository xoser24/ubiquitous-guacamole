import { redirect } from "next/navigation";
import { girisZorunlu } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { FinanceRemindersClient } from "@/components/finance/FinanceRemindersClient";

export default async function FinansHatirlatmalarPage() {
  const { profil } = await girisZorunlu();
  if (profil.rol !== "admin") redirect("/yetkisiz");

  const sb = await supabaseServer();
  const { data: outbox } = await sb
    .from("whatsapp_outbox")
    .select("id, tur, to_phone, status, text_body, created_at, error")
    .order("created_at", { ascending: false })
    .limit(500);

  return <FinanceRemindersClient initialOutbox={(outbox ?? []) as any} />;
}

