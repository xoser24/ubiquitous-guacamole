import { girisZorunlu } from "@/lib/auth";
import { DashboardHomeClient } from "@/components/DashboardHomeClient";

export default async function AnaSayfa() {
  const { profil } = await girisZorunlu();

  return <DashboardHomeClient rol={profil.rol} />;
}
