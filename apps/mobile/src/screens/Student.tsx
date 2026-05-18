import React, { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { renk } from "../ui/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Ogrenci">;

export function StudentScreen({ route }: Props) {
  const { id } = route.params;
  const { user, profil } = useAuth();
  const [ogrenci, setOgrenci] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [perf, setPerf] = useState<any>(null);

  useEffect(() => {
    if (!user || !profil) return;
    (async () => {
      const { data: s } = await supabase.from("students").select("*").eq("id", id).maybeSingle();
      setOgrenci(s ?? null);
      const { data: h } = await supabase.from("student_health").select("*").eq("student_id", id).maybeSingle();
      setHealth(h ?? null);
      const { data: p } = await supabase.from("student_performance_current").select("*").eq("student_id", id).maybeSingle();
      setPerf(p ?? null);
    })();
  }, [id, user?.id, profil?.rol]);

  if (!ogrenci) {
    return (
      <View style={{ flex: 1, backgroundColor: renk.bg, padding: 16 }}>
        <Text style={{ color: renk.muted }}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: renk.bg }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={{ backgroundColor: renk.panel, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#ffffff22" }}>
        <Text style={{ color: renk.text, fontSize: 18, fontWeight: "700" }}>{ogrenci.ad_soyad}</Text>
        <Text style={{ color: renk.muted, marginTop: 4 }}>
          {ogrenci.yas_grubu} • {ogrenci.mevki} • {ogrenci.ayak} ayak
        </Text>
        <Text style={{ color: renk.muted, marginTop: 4 }}>
          Boy/Kilo: {ogrenci.boy_cm ?? "-"} cm / {ogrenci.kilo_kg ?? "-"} kg
        </Text>
      </View>

      <View style={{ backgroundColor: "#ffffff10", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#ffffff22" }}>
        <Text style={{ color: renk.text, fontWeight: "700" }}>Veli Bilgileri</Text>
        <Text style={{ color: renk.muted, marginTop: 6 }}>Veli adı: {ogrenci.veli_adi}</Text>
        <Text style={{ color: renk.muted, marginTop: 4 }}>Telefon: {ogrenci.veli_telefon}</Text>
        <Text style={{ color: renk.muted, marginTop: 4 }}>Acil durum: {ogrenci.acil_durum_numarasi}</Text>
      </View>

      <View style={{ backgroundColor: "#ffffff10", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#ffffff22" }}>
        <Text style={{ color: renk.text, fontWeight: "700" }}>Sağlık</Text>
        <Text style={{ color: renk.muted, marginTop: 6 }}>Aktif sakatlık: {health?.aktif_sakatlik ?? "-"}</Text>
        <Text style={{ color: renk.muted, marginTop: 4 }}>Sakatlık geçmişi: {health?.sakatlik_gecmisi ?? "-"}</Text>
        <Text style={{ color: renk.muted, marginTop: 4 }}>Alerjiler: {health?.alerjiler ?? "-"}</Text>
      </View>

      <View style={{ backgroundColor: "#ffffff10", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#ffffff22" }}>
        <Text style={{ color: renk.text, fontWeight: "700" }}>Performans</Text>
        <Text style={{ color: renk.muted, marginTop: 6 }}>Hız: {perf?.hiz ?? "-"}</Text>
        <Text style={{ color: renk.muted, marginTop: 4 }}>Şut: {perf?.sut ?? "-"}</Text>
        <Text style={{ color: renk.muted, marginTop: 4 }}>Pas: {perf?.pas ?? "-"}</Text>
        <Text style={{ color: renk.muted, marginTop: 4 }}>Dripling: {perf?.dripling ?? "-"}</Text>
        <Text style={{ color: renk.muted, marginTop: 4 }}>Dayanıklılık: {perf?.dayaniklilik ?? "-"}</Text>
        <Text style={{ color: renk.muted, marginTop: 4 }}>Oyun zekası: {perf?.oyun_zekasi ?? "-"}</Text>
        <Text style={{ color: renk.muted, marginTop: 4 }}>Disiplin: {perf?.disiplin ?? "-"}</Text>
      </View>
    </ScrollView>
  );
}

