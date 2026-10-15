import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { theme } from "../theme";
import { api, setToken } from "../api";

type Props = { onLoggedIn: () => void };

export default function LoginScreen({ onLoggedIn }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const { token } = await api<{ token: string }>(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      setToken(token);
      onLoggedIn();
    } catch (e: any) {
      setError(e.status === 422 ? "Enter a valid email and a password of at least 6 characters." : e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.form}>
        <Text style={styles.title}>{mode === "login" ? "Log in" : "Create account"}</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholderTextColor={theme.colors.muted}
          placeholder="you@example.com"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          onSubmitEditing={submit}
          placeholderTextColor={theme.colors.muted}
          placeholder="At least 6 characters"
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={({ pressed }) => [styles.button, (busy || pressed) && styles.pressed]}
          onPress={submit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={theme.colors.backgroundDeep} />
          ) : (
            <Text style={styles.buttonText}>{mode === "login" ? "Log in" : "Register"}</Text>
          )}
        </Pressable>

        <Pressable onPress={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}>
          <Text style={styles.switch}>
            {mode === "login" ? "No account? Register" : "Have an account? Log in"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.lg, justifyContent: "center", alignItems: "center" },
  form: { width: "100%", maxWidth: 400 },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: "600", marginBottom: theme.spacing.lg },
  label: { color: theme.colors.muted, fontSize: 13, marginBottom: theme.spacing.xs },
  input: {
    backgroundColor: theme.colors.backgroundDeep,
    color: theme.colors.text,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.muted,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    fontSize: 16,
  },
  error: { color: "#FF8A80", marginBottom: theme.spacing.md },
  button: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius,
    padding: theme.spacing.md,
    alignItems: "center",
    marginTop: theme.spacing.sm,
  },
  pressed: { opacity: 0.8 },
  buttonText: { color: theme.colors.backgroundDeep, fontSize: 16, fontWeight: "700" },
  switch: { color: theme.colors.accent, textAlign: "center", marginTop: theme.spacing.md },
});
