import React, { useEffect, useState } from "react";
import { View, Text, FlatList } from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { renk } from "../ui/theme";

export function TrainingsScreen() {
  const { user, profil } = useAuth();
  const [liste, setListe] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !profil) return;
    (async () => {
      let q = supabase.from("training_sessions").select("id, baslik, tarih, saat, konum, coach_id").order("tarih", { ascending: false });
      if (profil.rol === "antrenor") q = q.eq("coach_id", user.id);
      const { data } = await q;
      setListe(data ?? []);
    })();
  }, [user?.id, profil?.rol]);

  return (
    <View style={{ flex: 1, backgroundColor: renk.bg }}>
      <FlatList
        contentContainerStyle={{ padding: 16, gap: 10 }}
        data={liste}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: "#ffffff10", borderColor: "#ffffff22", borderWidth: 1, borderRadius: 16, padding: 14 }}>
            <Text style={{ color: renk.text, fontSize: 16, fontWeight: "700" }}>{item.baslik}</Text>
            <Text style={{ color: renk.muted, marginTop: 4 }}>
              {item.tarih} • {item.saat} • {item.konum}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={{ color: renk.muted, padding: 16 }}>Kayıt bulunamadı.</Text>}
      />
    </View>
  );
}

