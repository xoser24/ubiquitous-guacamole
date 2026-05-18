import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { supabase } from "../lib/supabase";
import { renk } from "../ui/theme";

export function LoginScreen() {
  const [eposta, setEposta] = useState("");
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  async function giris() {
    setHata(null);
    setYukleniyor(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: eposta.trim(),
        password: sifre,
      });
      if (error) throw error;
    } catch {
      setHata("Giriş başarısız. E-posta veya şifre hatalı olabilir.");
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: renk.bg, padding: 16, justifyContent: "center" }}>
      <View style={{ backgroundColor: renk.panel, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#ffffff22" }}>
        <Text style={{ color: renk.text, fontSize: 22, fontWeight: "700" }}>Giriş Yap</Text>
        <Text style={{ color: renk.muted, marginTop: 6 }}>Hesaplar Admin tarafından oluşturulur.</Text>

        <Text style={{ color: renk.muted, marginTop: 16 }}>E-posta</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          value={eposta}
          onChangeText={setEposta}
          style={{ marginTop: 6, backgroundColor: "#00000033", borderColor: "#ffffff22", borderWidth: 1, borderRadius: 12, padding: 12, color: renk.text }}
        />

        <Text style={{ color: renk.muted, marginTop: 12 }}>Şifre</Text>
        <TextInput
          secureTextEntry
          value={sifre}
          onChangeText={setSifre}
          style={{ marginTop: 6, backgroundColor: "#00000033", borderColor: "#ffffff22", borderWidth: 1, borderRadius: 12, padding: 12, color: renk.text }}
        />

        {hata && <Text style={{ color: renk.danger, marginTop: 10 }}>{hata}</Text>}

        <Pressable onPress={giris} disabled={yukleniyor} style={{ marginTop: 14, backgroundColor: renk.gold, borderRadius: 12, padding: 12, alignItems: "center" }}>
          <Text style={{ color: "#000", fontWeight: "700" }}>{yukleniyor ? "Giriş yapılıyor..." : "Giriş Yap"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

