import React from "react";
import { View, Text, Pressable } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { useAuth } from "../lib/auth";
import { renk } from "../ui/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Ana">;

function Buton({ baslik, onPress }: { baslik: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ backgroundColor: "#ffffff10", borderColor: "#ffffff22", borderWidth: 1, borderRadius: 14, padding: 14 }}>
      <Text style={{ color: renk.text, fontSize: 16, fontWeight: "700" }}>{baslik}</Text>
    </Pressable>
  );
}

export function HomeScreen({ navigation }: Props) {
  const { profil, cikisYap } = useAuth();

  return (
    <View style={{ flex: 1, backgroundColor: renk.bg, padding: 16, gap: 12 }}>
      <View style={{ backgroundColor: renk.panel, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#ffffff22" }}>
        <Text style={{ color: renk.text, fontSize: 18, fontWeight: "700" }}>{profil?.ad_soyad ?? "Kullanıcı"}</Text>
        <Text style={{ color: renk.muted, marginTop: 4 }}>Rol: {profil?.rol ?? "Bilinmiyor"}</Text>
      </View>

      <Buton baslik="Öğrenciler" onPress={() => navigation.navigate("Ogrenciler")} />
      <Buton baslik="Antrenmanlar" onPress={() => navigation.navigate("Antrenmanlar")} />
      <Buton baslik="Bildirimler" onPress={() => navigation.navigate("Bildirimler")} />

      <Pressable onPress={() => cikisYap()} style={{ marginTop: "auto", backgroundColor: "#ffffff10", borderRadius: 14, padding: 14, alignItems: "center" }}>
        <Text style={{ color: renk.text, fontWeight: "700" }}>Çıkış Yap</Text>
      </Pressable>
    </View>
  );
}
