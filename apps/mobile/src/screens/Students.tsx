import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { renk } from "../ui/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Ogrenciler">;

export function StudentsScreen({ navigation }: Props) {
  const { user, profil } = useAuth();
  const [liste, setListe] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !profil) return;
    (async () => {
      let q = supabase.from("students").select("id, ad_soyad, yas_grubu, mevki, ayak, coach_id, parent_id, student_user_id").order("created_at", { ascending: false });
      if (profil.rol === "antrenor") q = q.eq("coach_id", user.id);
      if (profil.rol === "veli") q = q.eq("parent_id", user.id);
      if (profil.rol === "ogrenci") q = q.eq("student_user_id", user.id);
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
          <Pressable
            onPress={() => navigation.navigate("Ogrenci", { id: item.id, adSoyad: item.ad_soyad })}
            style={{ backgroundColor: "#ffffff10", borderColor: "#ffffff22", borderWidth: 1, borderRadius: 16, padding: 14 }}
          >
            <Text style={{ color: renk.text, fontSize: 16, fontWeight: "700" }}>{item.ad_soyad}</Text>
            <Text style={{ color: renk.muted, marginTop: 4 }}>
              {item.yas_grubu} • {item.mevki} • {item.ayak} ayak
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={{ color: renk.muted, padding: 16 }}>Kayıt bulunamadı.</Text>}
      />
    </View>
  );
}

