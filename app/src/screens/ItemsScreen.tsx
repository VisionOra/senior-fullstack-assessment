import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Image, Pressable, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { theme } from "../theme";
import { api } from "../api";

type Sku = { id: number; title: string; thumbnail: string | null; quantity: number };
type Props = { onLogout: () => void };

const MAX_SELECTED = 2;

export default function ItemsScreen({ onLogout }: Props) {
  const [skus, setSkus] = useState<Sku[] | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<Sku[]>("/skus");
      setSkus(data);
      setSelected((prev) => prev.filter((id) => data.some((s) => s.id === id)));
    } catch (e: any) {
      if (e.status === 401) onLogout();
      else setError(e.message);
    }
  }, [onLogout]);

  useEffect(() => { load(); }, [load]);

  function toggle(id: number) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < MAX_SELECTED ? [...prev, id] : prev
    );
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await api("/selections", { method: "POST", body: JSON.stringify({ sku_ids: selected }) });
      setSelected([]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      await load();
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Items</Text>
        <Pressable onPress={onLogout} hitSlop={8}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>Pick up to {MAX_SELECTED}. Selected: {selected.length}</Text>
      {error && <Text style={styles.error}>{error}</Text>}

      {skus === null ? (
        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: theme.spacing.lg }} />
      ) : skus.length === 0 ? (
        <Text style={styles.empty}>Nothing left. Every item has been taken.</Text>
      ) : (
        <FlatList
          data={skus}
          keyExtractor={(s) => String(s.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: theme.spacing.md }}
          contentContainerStyle={{ gap: theme.spacing.md, paddingBottom: 96 }}
          renderItem={({ item }) => {
            const on = selected.includes(item.id);
            return (
              <Pressable style={[styles.card, on && styles.cardOn]} onPress={() => toggle(item.id)}>
                {item.thumbnail && <Image source={{ uri: item.thumbnail }} style={styles.image} resizeMode="contain" />}
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              </Pressable>
            );
          }}
        />
      )}

      <View style={styles.footer}>
        <Pressable
          style={[styles.button, (selected.length === 0 || busy) && styles.disabled]}
          onPress={confirm}
          disabled={selected.length === 0 || busy}
        >
          {busy ? <ActivityIndicator color={theme.colors.backgroundDeep} /> : <Text style={styles.buttonText}>Confirm</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.lg, paddingTop: 56 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: "600" },
  signOut: { color: theme.colors.muted, fontSize: 13 },
  hint: { color: theme.colors.muted, marginVertical: theme.spacing.md },
  error: { color: "#FF8A80", marginBottom: theme.spacing.md },
  empty: { color: theme.colors.muted, marginTop: theme.spacing.lg },
  card: {
    flex: 1,
    backgroundColor: theme.colors.backgroundDeep,
    borderRadius: theme.radius,
    borderWidth: 2,
    borderColor: "transparent",
    padding: theme.spacing.sm,
  },
  cardOn: { borderColor: theme.colors.accent },
  image: { width: "100%", height: 120, marginBottom: theme.spacing.sm },
  cardTitle: { color: theme.colors.text, fontSize: 14 },
  footer: { position: "absolute", left: theme.spacing.lg, right: theme.spacing.lg, bottom: theme.spacing.lg },
  button: { backgroundColor: theme.colors.accent, borderRadius: theme.radius, padding: theme.spacing.md, alignItems: "center" },
  disabled: { opacity: 0.4 },
  buttonText: { color: theme.colors.backgroundDeep, fontSize: 16, fontWeight: "700" },
});
