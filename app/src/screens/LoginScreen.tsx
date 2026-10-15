import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";
import { api, Tokens } from "../api";
import { startSession } from "../session";
import { productArt } from "../components/assets";

type Props = { onLoggedIn: (email: string) => void; onBack: () => void };
type Mode = "login" | "register";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ onLoggedIn, onBack }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<"email" | "password" | null>(null);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const emailError = touched && !EMAIL_RE.test(email.trim()) ? "Enter a valid email address." : null;
  const passwordError = touched && password.length < 6 ? "Use at least 6 characters." : null;

  async function submit() {
    setTouched(true);
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed) || password.length < 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const tokens = await api<Tokens>(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({ email: trimmed, password }),
      });
      await startSession(tokens, trimmed);
      onLoggedIn(trimmed);
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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={styles.hero}>
          <View style={styles.heroInner}>
            <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
              <Ionicons name="arrow-back" size={20} color={theme.colors.onInk} />
            </Pressable>
            <View style={styles.art}>
              <Image source={productArt.lipstick} style={[styles.artSide, { left: 0, transform: [{ rotate: "-14deg" }] }]} resizeMode="contain" />
              <Image source={productArt.perfume} style={styles.artMain} resizeMode="contain" />
              <Image source={productArt.jadore} style={[styles.artSide, { right: 0, transform: [{ rotate: "12deg" }] }]} resizeMode="contain" />
            </View>
            <Text style={styles.heroTitle}>{mode === "login" ? "Get the last units\nbefore anyone else" : "Join and start\npicking today"}</Text>
          </View>
        </View>

        <View style={styles.sheet}>
          <View style={styles.form}>
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

            <Pressable
              onPress={() => emailRef.current?.focus()}
              style={[styles.field, focused === "email" && styles.fieldFocused, emailError && styles.fieldError]}
            >
              <View style={[styles.fieldIcon, focused === "email" && styles.fieldIconFocused]}>
                <Ionicons name="mail-outline" size={18} color={focused === "email" ? theme.colors.onInk : theme.colors.ink} />
              </View>
              <View style={styles.fieldBody}>
                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                ref={emailRef}
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
                placeholderTextColor="#A3AAB8"
                placeholder="you@example.com"
                />
              </View>
            </Pressable>
            {emailError && <Text style={styles.fieldHint}>{emailError}</Text>}

            <Pressable
              onPress={() => passwordRef.current?.focus()}
              style={[styles.field, focused === "password" && styles.fieldFocused, passwordError && styles.fieldError]}
            >
              <View style={[styles.fieldIcon, focused === "password" && styles.fieldIconFocused]}>
                <Ionicons name="lock-closed-outline" size={18} color={focused === "password" ? theme.colors.onInk : theme.colors.ink} />
              </View>
              <View style={styles.fieldBody}>
                <Text style={styles.fieldLabel}>Password</Text>
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
                placeholderTextColor="#A3AAB8"
                placeholder="At least 6 characters"
                />
              </View>
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              >
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={theme.colors.muted} />
              </Pressable>
            </Pressable>
            {passwordError && <Text style={styles.fieldHint}>{passwordError}</Text>}

            {error && (
              <View style={styles.alert} accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle" size={18} color={theme.colors.danger} />
                <Text style={styles.alertText}>{error}</Text>
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.button, busy && { opacity: 0.7 }, pressed && styles.pressed]}
              onPress={submit}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={theme.colors.onInk} />
              ) : (
                <>
                  <Text style={styles.buttonText}>{mode === "login" ? "Log in" : "Create account"}</Text>
                  <Ionicons name="arrow-forward" size={18} color={theme.colors.onInk} />
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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.inkDeep },
  scroll: { flexGrow: 1 },
  hero: { backgroundColor: theme.colors.inkDeep, paddingTop: 58, paddingBottom: 52, alignItems: "center" },
  heroInner: { width: "100%", maxWidth: 440, paddingHorizontal: theme.spacing.lg },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(245,241,230,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  art: { height: 170, marginTop: theme.spacing.sm, alignItems: "center", justifyContent: "center" },
  artMain: { width: 150, height: 150 },
  artSide: { position: "absolute", width: 96, height: 96, top: 40, opacity: 0.95 },
  heroTitle: { color: theme.colors.onInk, fontSize: 30, lineHeight: 36, fontWeight: "700", letterSpacing: -0.7, marginTop: theme.spacing.md },
  sheet: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    alignItems: "center",
  },
  form: { width: "100%", maxWidth: 440, paddingHorizontal: theme.spacing.lg },
  tabs: { flexDirection: "row", backgroundColor: theme.colors.tile, borderRadius: 999, padding: 4, marginBottom: theme.spacing.lg },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: "center" },
  tabActive: { backgroundColor: theme.colors.card, shadowColor: theme.colors.ink, shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  tabText: { color: theme.colors.muted, fontSize: 14, fontWeight: "500" },
  tabTextActive: { color: theme.colors.ink, fontWeight: "700" },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.colors.card,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "transparent",
    paddingLeft: 10,
    paddingRight: 16,
    paddingVertical: 10,
    marginBottom: 12,
    shadowColor: theme.colors.ink,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  fieldFocused: { borderColor: theme.colors.ink },
  fieldError: { borderColor: theme.colors.danger, marginBottom: 6 },
  fieldIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.bg, alignItems: "center", justifyContent: "center" },
  fieldIconFocused: { backgroundColor: theme.colors.ink },
  fieldBody: { flex: 1 },
  fieldLabel: { color: theme.colors.muted, fontSize: 12, fontWeight: "600" },
  fieldHint: { color: theme.colors.danger, fontSize: 12, marginBottom: 12, marginLeft: 6 },
  input: { color: theme.colors.ink, fontSize: 16, fontWeight: "500", paddingVertical: 2, paddingHorizontal: 0, marginTop: 2, outlineStyle: "none" } as any,
  alert: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.dangerSoft,
    borderRadius: theme.radius,
    padding: 12,
    marginBottom: theme.spacing.md,
  },
  alertText: { color: theme.colors.danger, fontSize: 14, flex: 1 },
  button: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.ink,
    borderRadius: 999,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.sm,
  },
  pressed: { transform: [{ scale: 0.98 }] },
  buttonText: { color: theme.colors.onInk, fontSize: 16, fontWeight: "700" },
  switch: { alignItems: "center", marginTop: theme.spacing.lg },
  switchText: { color: theme.colors.muted, fontSize: 14 },
  switchLink: { color: theme.colors.ink, fontWeight: "700", textDecorationLine: "underline" },
});
