import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthProvider, useAuth } from "./src/lib/auth";
import { LoginScreen } from "./src/screens/Login";
import { HomeScreen } from "./src/screens/Home";
import { StudentsScreen } from "./src/screens/Students";
import { StudentScreen } from "./src/screens/Student";
import { TrainingsScreen } from "./src/screens/Trainings";
import { NotificationsScreen } from "./src/screens/Notifications";

export type RootStackParamList = {
  Giris: undefined;
  Ana: undefined;
  Ogrenciler: undefined;
  Ogrenci: { id: string; adSoyad: string };
  Antrenmanlar: undefined;
  Bildirimler: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function Router() {
  const { hazir, user } = useAuth();
  if (!hazir) return null;

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#0B0E14" },
        headerTintColor: "#E5E7EB",
      }}
    >
      {!user ? (
        <Stack.Screen name="Giris" component={LoginScreen} options={{ title: "Giriş Yap" }} />
      ) : (
        <>
          <Stack.Screen name="Ana" component={HomeScreen} options={{ title: "Futbol Akademisi" }} />
          <Stack.Screen name="Ogrenciler" component={StudentsScreen} options={{ title: "Öğrenciler" }} />
          <Stack.Screen name="Ogrenci" component={StudentScreen} options={({ route }) => ({ title: route.params.adSoyad })} />
          <Stack.Screen name="Antrenmanlar" component={TrainingsScreen} options={{ title: "Antrenmanlar" }} />
          <Stack.Screen name="Bildirimler" component={NotificationsScreen} options={{ title: "Bildirimler" }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Router />
      </NavigationContainer>
    </AuthProvider>
  );
}
