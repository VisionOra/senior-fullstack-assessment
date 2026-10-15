import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { theme } from "../theme";
import { api } from "../api";

type Sku = { id: number; title: string; price: string | null; thumbnail: string | null; quantity: number };
type Props = { onLogout: () => void };
type Notice = { kind: "ok" | "error"; text: string };

const MAX_SELECTED = 2;
const MAX_WIDTH = 1040;

function columnsFor(width: number) {
  if (width >= 1000) return 4;
  if (width >= 680) return 3;
  return 2;
}

export default function ItemsScreen({ onLogout }: Props) {
  const { width } = useWindowDimensions();
  const columns = columnsFor(Math.min(width, MAX_WIDTH));
  const [skus, setSkus] = useState<Sku[] | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<Sku[]>("/skus");
      setSkus(data);
      setSelected((prev) => prev.filter((id) => data.some((s) => s.id === id)));
    } catch (e: any) {
      if (e.status === 401) onLogout();
      else setNotice({ kind: "error", text: e.message || "Could not load items." });
      setSkus((prev) => prev ?? []);
    }
  }, [onLogout]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const toggle = useCallback((id: number) => {
    setNotice(null);
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SELECTED) {
        setNotice({ kind: "error", text: `You can pick up to ${MAX_SELECTED} items.` });
        return prev;
      }
      return [...prev, id];
    });
  }, []);

  async function confirm() {
    setBusy(true);
    setNotice(null);
    try {
      await api("/selections", { method: "POST", body: JSON.stringify({ sku_ids: selected }) });
      setNotice({ kind: "ok", text: selected.length === 1 ? "Confirmed. 1 item is yours." : `Confirmed. ${selected.length} items are yours.` });
      setSelected([]);
    } catch (e: any) {
      if (e.status === 401) return onLogout();
      setNotice({ kind: "error", text: e.message || "Could not confirm. Try again." });
    } finally {
      await load();
      setBusy(false);
    }
  }

  const order = useMemo(() => new Map(selected.map((id, i) => [id, i + 1])), [selected]);

  const renderItem = useCallback(
    ({ item }: { item: Sku }) => <SkuCard sku={item} position={order.get(item.id)} onToggle={toggle} />,
    [order, toggle]
  );

  return (
    <View style={styles.root}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Pick up to two</Text>
            <Text style={styles.subtitle}>Stock is shared. Once an item hits zero it is gone for everyone.</Text>
          </View>
          <Pressable onPress={onLogout} hitSlop={8} accessibilityRole="button" style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.6 }]}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>

        {notice && (
          <View style={[styles.notice, notice.kind === "error" ? styles.noticeError : styles.noticeOk]} accessibilityLiveRegion="polite">
            <Text style={[styles.noticeText, { color: notice.kind === "error" ? theme.colors.danger : theme.colors.accent }]}>{notice.text}</Text>
          </View>
        )}

        {skus === null ? (
          <SkeletonGrid columns={columns} />
        ) : (
          <FlatList
            key={columns}
            data={skus}
            keyExtractor={(s) => String(s.id)}
            numColumns={columns}
            renderItem={renderItem}
            extraData={order}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.list}
            initialNumToRender={12}
            windowSize={5}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.accent} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Everything is taken</Text>
                <Text style={styles.emptyText}>Every item has sold out. Pull down to check again.</Text>
              </View>
            }
          />
        )}
      </View>

      <View style={styles.bar}>
        <View style={styles.barInner}>
          <Text style={styles.barText}>
            <Text style={styles.barCount}>{selected.length}</Text> of {MAX_SELECTED} selected
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: selected.length === 0 || busy }}
            style={({ pressed }) => [styles.button, (selected.length === 0 || busy) && styles.buttonDisabled, pressed && styles.pressed]}
            onPress={confirm}
            disabled={selected.length === 0 || busy}
          >
            {busy ? <ActivityIndicator color={theme.colors.backgroundDeep} /> : <Text style={styles.buttonText}>Confirm</Text>}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

type CardProps = { sku: Sku; position?: number; onToggle: (id: number) => void };

const SkuCard = memo(function SkuCard({ sku, position, onToggle }: CardProps) {
  const on = position !== undefined;
  const low = sku.quantity <= 3;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={`${sku.title}, ${sku.quantity} left`}
      onPress={() => onToggle(sku.id)}
      style={({ pressed }) => [styles.card, on && styles.cardOn, pressed && styles.pressed]}
    >
      <View style={styles.imageWrap}>
        {sku.thumbnail ? (
          <Image source={{ uri: sku.thumbnail }} style={styles.image} resizeMode="contain" accessibilityIgnoresInvertColors />
        ) : null}
        {on && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{position}</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>{sku.title}</Text>
      <Text style={[styles.stock, low && { color: theme.colors.accent }]}>{sku.quantity} left</Text>
    </Pressable>
  );
});

function SkeletonGrid({ columns }: { columns: number }) {
  return (
    <View style={[styles.list, { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md }]}>
      {Array.from({ length: columns * 2 }).map((_, i) => (
        <View key={i} style={[styles.card, styles.skeleton, { flexBasis: `${100 / columns - 4}%` }]}>
          <View style={[styles.imageWrap, { backgroundColor: theme.colors.surface }]} />
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, { width: "40%" }]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, width: "100%", maxWidth: MAX_WIDTH, alignSelf: "center", paddingHorizontal: theme.spacing.lg, paddingTop: 56 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  title: { color: theme.colors.text, fontSize: 30, fontWeight: "700", letterSpacing: -0.5 },
  subtitle: { color: theme.colors.muted, fontSize: 14, lineHeight: 20, marginTop: theme.spacing.xs, maxWidth: 520 },
  signOut: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: theme.radius, borderWidth: 1, borderColor: theme.colors.border },
  signOutText: { color: theme.colors.muted, fontSize: 13, fontWeight: "500" },
  notice: { borderRadius: theme.radius, borderWidth: 1, paddingVertical: 10, paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.md },
  noticeOk: { borderColor: theme.colors.accent, backgroundColor: "rgba(201,162,75,0.08)" },
  noticeError: { borderColor: theme.colors.danger, backgroundColor: "rgba(242,139,130,0.08)" },
  noticeText: { fontSize: 14, fontWeight: "500" },
  list: { paddingBottom: 120, gap: theme.spacing.md },
  row: { gap: theme.spacing.md },
  card: {
    flex: 1,
    backgroundColor: theme.colors.backgroundDeep,
    borderRadius: theme.radius,
    borderWidth: 2,
    borderColor: theme.colors.backgroundDeep,
    padding: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  cardOn: { borderColor: theme.colors.accent },
  pressed: { transform: [{ scale: 0.98 }] },
  imageWrap: { aspectRatio: 1, borderRadius: theme.radius - 4, backgroundColor: theme.colors.surface, marginBottom: theme.spacing.sm, overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  badge: {
    position: "absolute",
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: theme.colors.backgroundDeep, fontWeight: "700", fontSize: 13 },
  cardTitle: { color: theme.colors.text, fontSize: 14, fontWeight: "500", lineHeight: 19, minHeight: 38, paddingHorizontal: theme.spacing.xs },
  stock: { color: theme.colors.muted, fontSize: 12, marginTop: theme.spacing.xs, paddingHorizontal: theme.spacing.xs, fontVariant: ["tabular-nums"] },
  skeleton: { flex: 0, opacity: 0.6 },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: theme.colors.surface, marginTop: theme.spacing.sm, marginHorizontal: theme.spacing.xs, width: "80%" },
  empty: { alignItems: "center", paddingVertical: 64 },
  emptyTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "600" },
  emptyText: { color: theme.colors.muted, fontSize: 14, marginTop: theme.spacing.sm },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.backgroundDeep,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  barInner: {
    width: "100%",
    maxWidth: MAX_WIDTH,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  barText: { color: theme.colors.muted, fontSize: 14 },
  barCount: { color: theme.colors.text, fontWeight: "700", fontVariant: ["tabular-nums"] },
  button: { backgroundColor: theme.colors.accent, borderRadius: theme.radius, paddingVertical: 14, paddingHorizontal: 40, alignItems: "center", minWidth: 140 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: theme.colors.backgroundDeep, fontSize: 16, fontWeight: "700" },
});
