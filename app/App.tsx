import React, { useCallback, useState } from "react";
import { StatusBar } from "expo-status-bar";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import LoginScreen from "./src/screens/LoginScreen";
import ItemsScreen from "./src/screens/ItemsScreen";
import { setToken } from "./src/api";
import { Category } from "./src/components/assets";

type Stage = "onboarding" | "auth" | "items";

export default function App() {
  const [stage, setStage] = useState<Stage>("onboarding");
  const [category, setCategory] = useState<Category>("all");
  const [email, setEmail] = useState("");

  const logout = useCallback(() => {
    setToken(null);
    setStage("auth");
  }, []);

  return (
    <>
      <StatusBar style={stage === "auth" ? "light" : "dark"} />
      {stage === "onboarding" && (
        <OnboardingScreen
          onDone={(c) => {
            setCategory(c);
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
