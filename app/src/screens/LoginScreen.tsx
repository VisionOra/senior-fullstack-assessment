import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme";

type Props = { onLoggedIn: () => void };

export default function LoginScreen(_: Props) {
  // TODO: email + password, register / login, call setToken(...) then onLoggedIn()
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Login</Text>
      <Text style={styles.hint}>Build me.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.lg, justifyContent: "center" },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: "600", marginBottom: theme.spacing.md },
  hint: { color: theme.colors.muted },
});
