import React, { useCallback, useState } from "react";
import { StatusBar } from "expo-status-bar";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import LoginScreen from "./src/screens/LoginScreen";
import ItemsScreen from "./src/screens/ItemsScreen";
import { setToken } from "./src/api";

type Stage = "onboarding" | "auth" | "items";

export default function App() {
  const [stage, setStage] = useState<Stage>("onboarding");
  const logout = useCallback(() => {
    setToken(null);
    setStage("auth");
  }, []);

  return (
    <>
      <StatusBar style="light" />
      {stage === "onboarding" && <OnboardingScreen onDone={() => setStage("auth")} />}
      {stage === "auth" && <LoginScreen onLoggedIn={() => setStage("items")} />}
      {stage === "items" && <ItemsScreen onLogout={logout} />}
    </>
  );
}
