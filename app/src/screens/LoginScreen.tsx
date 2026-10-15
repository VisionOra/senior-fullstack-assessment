import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme, brand } from "../theme";
import { api, setToken } from "../api";
import ProductTile from "../components/ProductTile";
import { productArt } from "../components/assets";

type Props = { onLoggedIn: () => void };
type Mode = "login" | "register";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ onLoggedIn }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<"email" | "password" | null>(null);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const emailError = touched && !EMAIL_RE.test(email.trim()) ? "Enter a valid email address." : null;
  const passwordError = touched && password.length < 6 ? "Use at least 6 characters." : null;

  async function submit() {
    setTouched(true);
    if (!EMAIL_RE.test(email.trim()) || password.length < 6 || busy) return;
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
    setTouched(false);
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <ProductTile source={productArt.lipstick} size={84} rotate={-10} style={{ position: "absolute", left: "8%", top: 28 }} />
          <ProductTile source={productArt.perfume} size={112} style={{ position: "absolute", alignSelf: "center", top: 4 }} />
          <ProductTile source={productArt.palette} size={84} rotate={9} style={{ position: "absolute", right: "8%", top: 36 }} />
        </View>

        <View style={styles.form}>
          <View style={styles.brandRow}>
            <View style={styles.logo}>
              <Ionicons name="bag-handle" size={16} color={theme.colors.backgroundDeep} />
            </View>
            <Text style={styles.brand}>{brand}</Text>
          </View>

          <Text style={styles.title}>{mode === "login" ? "Welcome back" : "Create your account"}</Text>
          <Text style={styles.subtitle}>
            {mode === "login" ? "Log in to see what is still on the shelf." : "It takes ten seconds. Then pick up to two items."}
          </Text>

          <View style={styles.tabs} accessibilityRole="tablist">
            {(["login", "register"] as Mode[]).map((m) => (
              <Pressable
                key={m}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === m }}
                onPress={() => switchMode(m)}
                style={[styles.tab, mode === m && styles.tabActive]}
              >
                <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>{m === "login" ? "Log in" : "Register"}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Email</Text>
          <View style={[styles.field, focused === "email" && styles.fieldFocused, emailError && styles.fieldError]}>
            <Ionicons name="mail-outline" size={18} color={focused === "email" ? theme.colors.accent : theme.colors.muted} />
            <TextInput
              style={styles.input}
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
              onSubmitEditing={() => passwordRef.current?.focus()}
              placeholderTextColor={theme.colors.muted}
              placeholder="you@example.com"
            />
          </View>
          {emailError && <Text style={styles.fieldHint}>{emailError}</Text>}

          <Text style={styles.label}>Password</Text>
          <View style={[styles.field, focused === "password" && styles.fieldFocused, passwordError && styles.fieldError]}>
            <Ionicons name="lock-closed-outline" size={18} color={focused === "password" ? theme.colors.accent : theme.colors.muted} />
            <TextInput
              ref={passwordRef}
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
              secureTextEntry={!showPassword}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              textContentType={mode === "login" ? "password" : "newPassword"}
              returnKeyType="go"
              onSubmitEditing={submit}
              placeholderTextColor={theme.colors.muted}
              placeholder="At least 6 characters"
            />
            <Pressable
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
            >
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={theme.colors.muted} />
            </Pressable>
          </View>
          {passwordError && <Text style={styles.fieldHint}>{passwordError}</Text>}

          {error && (
            <View style={styles.alert} accessibilityLiveRegion="polite">
              <Ionicons name="alert-circle" size={18} color={theme.colors.danger} />
              <Text style={styles.alertText}>{error}</Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, busy && styles.buttonBusy, pressed && styles.pressed]}
            onPress={submit}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={theme.colors.backgroundDeep} />
            ) : (
              <>
                <Text style={styles.buttonText}>{mode === "login" ? "Log in" : "Create account"}</Text>
                <Ionicons name="arrow-forward" size={18} color={theme.colors.backgroundDeep} />
              </>
            )}
          </Pressable>

          <Pressable onPress={() => switchMode(mode === "login" ? "register" : "login")} style={styles.switch}>
            <Text style={styles.switchText}>
              {mode === "login" ? "New here? " : "Already have an account? "}
              <Text style={styles.switchLink}>{mode === "login" ? "Create an account" : "Log in"}</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: theme.spacing.lg, paddingTop: 64 },
  hero: { width: "100%", maxWidth: 400, height: 150, marginBottom: theme.spacing.lg },
  form: { width: "100%", maxWidth: 400 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  logo: { width: 28, height: 28, borderRadius: 8, backgroundColor: theme.colors.accent, alignItems: "center", justifyContent: "center" },
  brand: { color: theme.colors.text, fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
  title: { color: theme.colors.text, fontSize: 30, fontWeight: "700", letterSpacing: -0.6 },
  subtitle: { color: theme.colors.muted, fontSize: 15, lineHeight: 22, marginTop: theme.spacing.sm, marginBottom: theme.spacing.lg },
  tabs: { flexDirection: "row", backgroundColor: theme.colors.backgroundDeep, borderRadius: theme.radius, padding: 4, marginBottom: theme.spacing.lg },
  tab: { flex: 1, paddingVertical: 10, borderRadius: theme.radius - 4, alignItems: "center" },
  tabActive: { backgroundColor: theme.colors.surfaceRaised },
  tabText: { color: theme.colors.muted, fontSize: 14, fontWeight: "500" },
  tabTextActive: { color: theme.colors.text, fontWeight: "600" },
  label: { color: theme.colors.text, fontSize: 13, fontWeight: "500", marginBottom: theme.spacing.sm },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: theme.colors.backgroundDeep,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    marginBottom: theme.spacing.md,
  },
  fieldFocused: { borderColor: theme.colors.accent },
  fieldError: { borderColor: theme.colors.danger, marginBottom: theme.spacing.xs },
  fieldHint: { color: theme.colors.danger, fontSize: 12, marginBottom: theme.spacing.md },
  input: { flex: 1, color: theme.colors.text, fontSize: 16, paddingVertical: 14, outlineStyle: "none" } as any,
  alert: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: "rgba(242,139,130,0.08)",
    borderColor: "rgba(242,139,130,0.4)",
    borderWidth: 1,
    borderRadius: theme.radius,
    padding: 12,
    marginBottom: theme.spacing.md,
  },
  alertText: { color: theme.colors.danger, fontSize: 14, flex: 1 },
  button: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.sm,
  },
  buttonBusy: { opacity: 0.7 },
  pressed: { transform: [{ scale: 0.98 }] },
  buttonText: { color: theme.colors.backgroundDeep, fontSize: 16, fontWeight: "700" },
  switch: { alignItems: "center", marginTop: theme.spacing.lg },
  switchText: { color: theme.colors.muted, fontSize: 14 },
  switchLink: { color: theme.colors.accent, fontWeight: "600" },
});
