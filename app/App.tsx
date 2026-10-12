import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import LoginScreen from "./src/screens/LoginScreen";
import ItemsScreen from "./src/screens/ItemsScreen";
import { setToken } from "./src/api";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  return (
    <>
      <StatusBar style="light" />
      {loggedIn ? (
        <ItemsScreen onLogout={() => { setToken(null); setLoggedIn(false); }} />
      ) : (
        <LoginScreen onLoggedIn={() => setLoggedIn(true)} />
      )}
    </>
  );
}
