import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { theme } from "../theme";
import { api, setToken } from "../api";

type Props = { onLoggedIn: () => void };
type Mode = "login" | "register";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ onLoggedIn }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focused, setFocused] = useState<"email" | "password" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = EMAIL_RE.test(email.trim()) && password.length >= 6 && !busy;

  async function submit() {
    if (!canSubmit) {
      setError("Enter a valid email and a password of at least 6 characters.");
      return;
    }
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
      setError(e.message || "Could not reach the server. Try again.");
      setBusy(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.form}>
        <Text style={styles.title}>{mode === "login" ? "Welcome back" : "Create your account"}</Text>
        <Text style={styles.subtitle}>Sign in to pick up to two items before they sell out.</Text>

        <View style={styles.tabs} accessibilityRole="tablist">
          {(["login", "register"] as Mode[]).map((m) => (
            <Pressable
              key={m}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === m }}
              onPress={() => switchMode(m)}
              style={[styles.tab, mode === m && styles.tabActive]}
            >
              <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
                {m === "login" ? "Log in" : "Register"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, focused === "email" && styles.inputFocused]}
          value={email}
          onChangeText={setEmail}
          onFocus={() => setFocused("email")}
          onBlur={() => setFocused(null)}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          placeholderTextColor={theme.colors.muted}
          placeholder="you@example.com"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={[styles.input, focused === "password" && styles.inputFocused]}
          value={password}
          onChangeText={setPassword}
          onFocus={() => setFocused("password")}
          onBlur={() => setFocused(null)}
          secureTextEntry
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          returnKeyType="go"
          onSubmitEditing={submit}
          placeholderTextColor={theme.colors.muted}
          placeholder="At least 6 characters"
        />

        {error && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, !canSubmit && styles.buttonDisabled, pressed && styles.pressed]}
          onPress={submit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={theme.colors.backgroundDeep} />
          ) : (
            <Text style={styles.buttonText}>{mode === "login" ? "Log in" : "Create account"}</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.lg, justifyContent: "center", alignItems: "center" },
  form: { width: "100%", maxWidth: 380 },
  title: { color: theme.colors.text, fontSize: 30, fontWeight: "700", letterSpacing: -0.5 },
  subtitle: { color: theme.colors.muted, fontSize: 15, lineHeight: 22, marginTop: theme.spacing.sm, marginBottom: theme.spacing.lg },
  tabs: {
    flexDirection: "row",
    backgroundColor: theme.colors.backgroundDeep,
    borderRadius: theme.radius,
    padding: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: theme.radius - 4, alignItems: "center" },
  tabActive: { backgroundColor: theme.colors.surface },
  tabText: { color: theme.colors.muted, fontSize: 14, fontWeight: "500" },
  tabTextActive: { color: theme.colors.text, fontWeight: "600" },
  label: { color: theme.colors.text, fontSize: 13, fontWeight: "500", marginBottom: theme.spacing.sm },
  input: {
    backgroundColor: theme.colors.backgroundDeep,
    color: theme.colors.text,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    marginBottom: theme.spacing.md,
    fontSize: 16,
  },
  inputFocused: { borderColor: theme.colors.accent },
  error: { color: theme.colors.danger, fontSize: 14, marginBottom: theme.spacing.md },
  button: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: theme.spacing.sm,
  },
  buttonDisabled: { opacity: 0.5 },
  pressed: { transform: [{ scale: 0.98 }] },
  buttonText: { color: theme.colors.backgroundDeep, fontSize: 16, fontWeight: "700" },
});
