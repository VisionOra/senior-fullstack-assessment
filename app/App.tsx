import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import LoginScreen from "./src/screens/LoginScreen";
import ItemsScreen from "./src/screens/ItemsScreen";
import { onSessionExpired, setTokens } from "./src/api";
import { endSession, hasOnboarded, markOnboarded, restoreSession } from "./src/session";
import { Category } from "./src/components/assets";
import { theme } from "./src/theme";

type Stage = "loading" | "onboarding" | "auth" | "items";

export default function App() {
  const [stage, setStage] = useState<Stage>("loading");
  const [category, setCategory] = useState<Category>("all");
  const [email, setEmail] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const [restored, onboarded] = await Promise.all([restoreSession(), hasOnboarded()]);
      if (!active) return;
      if (restored !== null) {
        setEmail(restored);
        setStage("items");
      } else {
        setStage(onboarded ? "auth" : "onboarding");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    onSessionExpired(() => {
      setTokens(null, null);
      setStage("auth");
    });
    return () => onSessionExpired(null);
  }, []);

  const logout = useCallback(async () => {
    setStage("auth");
    await endSession();
  }, []);

  return (
    <>
      <StatusBar style={stage === "auth" ? "light" : "dark"} />
      {stage === "loading" && (
        <View style={styles.splash}>
          <View style={styles.logo}>
            <Ionicons name="bag-handle" size={30} color={theme.colors.accent} />
          </View>
          <ActivityIndicator color={theme.colors.ink} style={{ marginTop: 24 }} />
        </View>
      )}
      {stage === "onboarding" && (
        <OnboardingScreen
          onDone={(c) => {
            setCategory(c);
            markOnboarded();
            setStage("auth");
          }}
        />
      )}
      {stage === "auth" && (
        <LoginScreen
          onBack={() => setStage("onboarding")}
          onLoggedIn={(e) => {
            setEmail(e);
            setStage("items");
          }}
        />
      )}
      {stage === "items" && <ItemsScreen email={email} initialCategory={category} onLogout={logout} />}
    </>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: theme.colors.bg, alignItems: "center", justifyContent: "center" },
  logo: { width: 72, height: 72, borderRadius: 24, backgroundColor: theme.colors.ink, alignItems: "center", justifyContent: "center" },
});
