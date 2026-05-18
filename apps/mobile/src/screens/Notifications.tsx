import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { renk } from "../ui/theme";

export function NotificationsScreen() {
  const { user } = useAuth();
  const [liste, setListe] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
      setListe(data ?? []);
    })();
  }, [user?.id]);

  async function okunduYap(id: string) {
    await supabase.from("notifications").update({ okundu: true }).eq("id", id);
    setListe((l) => l.map((n) => (n.id === id ? { ...n, okundu: true } : n)));
  }

  return (
    <View style={{ flex: 1, backgroundColor: renk.bg }}>
      <FlatList
        contentContainerStyle={{ padding: 16, gap: 10 }}
        data={liste}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: "#ffffff10", borderColor: "#ffffff22", borderWidth: 1, borderRadius: 16, padding: 14 }}>
            <Text style={{ color: renk.text, fontSize: 16, fontWeight: "700" }}>{item.baslik}</Text>
            <Text style={{ color: renk.muted, marginTop: 6 }}>{item.icerik}</Text>
            <Text style={{ color: renk.muted, marginTop: 6, fontSize: 12 }}>{new Date(item.created_at).toLocaleString("tr-TR")}</Text>
            {!item.okundu && (
              <Pressable onPress={() => okunduYap(item.id)} style={{ marginTop: 10, backgroundColor: renk.gold, borderRadius: 12, padding: 10, alignItems: "center" }}>
                <Text style={{ color: "#000", fontWeight: "700" }}>Okundu</Text>
              </Pressable>
            )}
          </View>
        )}
        ListEmptyComponent={<Text style={{ color: renk.muted, padding: 16 }}>Bildirim yok.</Text>}
      />
    </View>
  );
}

