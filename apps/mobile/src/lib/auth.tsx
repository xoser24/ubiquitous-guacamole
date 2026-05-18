import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { supabase } from "./supabase";

type Profil = {
  id: string;
  rol: "admin" | "antrenor" | "veli" | "ogrenci";
  ad_soyad: string;
};

type AuthState = {
  hazir: boolean;
  user: User | null;
  profil: Profil | null;
  cikisYap: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

async function tokenKaydet(userId: string) {
  try {
    const izin = await Notifications.getPermissionsAsync();
    if (izin.status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      if (req.status !== "granted") return;
    }
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });
    if (!token.data) return;

    await supabase.from("notification_tokens").upsert(
      { user_id: userId, platform: "expo", token: token.data },
      { onConflict: "platform,token" }
    );
  } catch {
    // sessiz
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [hazir, setHazir] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);

  async function profilGetir(u: User | null) {
    if (!u) {
      setProfil(null);
      return;
    }
    const { data } = await supabase.from("profiles").select("id, rol, ad_soyad").eq("id", u.id).maybeSingle();
    setProfil((data as any) ?? null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      profilGetir(data.session?.user ?? null).finally(() => setHazir(true));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      setUser(session?.user ?? null);
      profilGetir(session?.user ?? null);
      if (session?.user) tokenKaydet(session.user.id);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      hazir,
      user,
      profil,
      cikisYap: async () => {
        await supabase.auth.signOut();
      },
    }),
    [hazir, user, profil]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("AuthProvider eksik.");
  return v;
}

