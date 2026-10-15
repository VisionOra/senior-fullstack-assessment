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
import { Ionicons } from "@expo/vector-icons";
import { theme, brand } from "../theme";
import { api } from "../api";
import { productArt } from "../components/assets";

type Sku = { id: number; title: string; price: string | null; thumbnail: string | null; quantity: number };
type Props = { onLogout: () => void };
type Notice = { kind: "ok" | "error"; text: string };

const MAX_SELECTED = 2;
const MAX_WIDTH = 1080;
const LOW_STOCK = 5;

function columnsFor(width: number) {
  if (width >= 1000) return 4;
  if (width >= 680) return 3;
  return 2;
}

function formatPrice(price: string | null) {
  if (price === null) return null;
  return `$${Number(price).toFixed(2)}`;
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
      if (e.status === 401) return onLogout();
      setNotice({ kind: "error", text: e.message || "Could not load items." });
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
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SELECTED) return prev;
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
  const full = selected.length >= MAX_SELECTED;
  const picked = useMemo(
    () => selected.map((id) => skus?.find((s) => s.id === id)).filter(Boolean) as Sku[],
    [selected, skus]
  );

  const renderItem = useCallback(
    ({ item }: { item: Sku }) => (
      <SkuCard sku={item} position={order.get(item.id)} locked={full && !order.has(item.id)} onToggle={toggle} />
    ),
    [order, full, toggle]
  );

  const header = (
    <View>
      <View style={styles.banner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Today's shelf</Text>
          <Text style={styles.bannerText}>
            {skus ? `${skus.length} items in stock. ` : ""}Pick up to two. Stock is shared with everyone.
          </Text>
        </View>
        <Image source={productArt.perfume} style={styles.bannerImage} resizeMode="contain" />
      </View>

      {notice && (
        <View style={[styles.notice, notice.kind === "error" ? styles.noticeError : styles.noticeOk]} accessibilityLiveRegion="polite">
          <Ionicons
            name={notice.kind === "error" ? "alert-circle" : "checkmark-circle"}
            size={18}
            color={notice.kind === "error" ? theme.colors.danger : theme.colors.accent}
          />
          <Text style={[styles.noticeText, { color: notice.kind === "error" ? theme.colors.danger : theme.colors.text }]}>
            {notice.text}
          </Text>
          <Pressable onPress={() => setNotice(null)} hitSlop={10} accessibilityLabel="Dismiss">
            <Ionicons name="close" size={16} color={theme.colors.muted} />
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View style={styles.topBarInner}>
          <View style={styles.brandRow}>
            <View style={styles.logo}>
              <Ionicons name="bag-handle" size={16} color={theme.colors.backgroundDeep} />
            </View>
            <Text style={styles.brand}>{brand}</Text>
          </View>
          <Pressable
            onPress={onLogout}
            hitSlop={8}
            accessibilityRole="button"
            style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="log-out-outline" size={16} color={theme.colors.muted} />
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.container}>
        {skus === null ? (
          <>
            {header}
            <SkeletonGrid columns={columns} />
          </>
        ) : (
          <FlatList
            key={columns}
            data={skus}
            keyExtractor={(s) => String(s.id)}
            numColumns={columns}
            renderItem={renderItem}
            extraData={order}
            ListHeaderComponent={header}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            initialNumToRender={12}
            windowSize={5}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.accent} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="cube-outline" size={28} color={theme.colors.accent} />
                </View>
                <Text style={styles.emptyTitle}>The shelf is empty</Text>
                <Text style={styles.emptyText}>Every item has sold out. Pull down to check again.</Text>
              </View>
            }
          />
        )}
      </View>

      <View style={styles.bar}>
        <View style={styles.barInner}>
          <View style={styles.barLeft}>
            <View style={styles.thumbs}>
              {Array.from({ length: MAX_SELECTED }).map((_, i) => {
                const sku = picked[i];
                return (
                  <View key={i} style={[styles.thumb, i > 0 && { marginLeft: -10 }, !sku && styles.thumbEmpty]}>
                    {sku?.thumbnail ? <Image source={{ uri: sku.thumbnail }} style={styles.thumbImage} resizeMode="contain" /> : null}
                  </View>
                );
              })}
            </View>
            <View>
              <Text style={styles.barCount}>
                {selected.length} of {MAX_SELECTED} selected
              </Text>
              <Text style={styles.barHint}>{full ? "Limit reached" : selected.length ? "Add one more or confirm" : "Tap items to pick"}</Text>
            </View>
          </View>
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

type CardProps = { sku: Sku; position?: number; locked: boolean; onToggle: (id: number) => void };

const SkuCard = memo(function SkuCard({ sku, position, locked, onToggle }: CardProps) {
  const on = position !== undefined;
  const low = sku.quantity <= LOW_STOCK;
  const price = formatPrice(sku.price);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on, disabled: locked }}
      accessibilityLabel={`${sku.title}${price ? `, ${price}` : ""}, ${sku.quantity} left`}
      onPress={() => onToggle(sku.id)}
      disabled={locked}
      style={({ pressed }) => [styles.card, on && styles.cardOn, locked && styles.cardLocked, pressed && styles.pressed]}
    >
      <View style={styles.imageWrap}>
        {sku.thumbnail ? <Image source={{ uri: sku.thumbnail }} style={styles.image} resizeMode="contain" /> : null}
        <View style={[styles.check, on && styles.checkOn]}>
          {on ? <Text style={styles.checkText}>{position}</Text> : <Ionicons name="add" size={16} color={theme.colors.text} />}
        </View>
        {low && (
          <View style={styles.lowPill}>
            <Ionicons name="flash" size={11} color={theme.colors.backgroundDeep} />
            <Text style={styles.lowPillText}>Only {sku.quantity} left</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{sku.title}</Text>
        <View style={styles.cardMeta}>
          {price && <Text style={styles.price}>{price}</Text>}
          {!low && <Text style={styles.stock}>{sku.quantity} in stock</Text>}
        </View>
      </View>
    </Pressable>
  );
});

function SkeletonGrid({ columns }: { columns: number }) {
  return (
    <View style={styles.skeletonGrid}>
      {Array.from({ length: columns * 2 }).map((_, i) => (
        <View key={i} style={[styles.card, { flexBasis: `${100 / columns - 3}%`, flexGrow: 0, opacity: 0.6 }]}>
          <View style={styles.imageWrap} />
          <View style={styles.cardBody}>
            <View style={styles.skeletonLine} />
            <View style={[styles.skeletonLine, { width: "40%" }]} />
          </View>
        </View>
      ))}
      <ActivityIndicator color={theme.colors.accent} style={{ position: "absolute", alignSelf: "center", top: 80 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  topBar: { paddingTop: 56, paddingBottom: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  topBarInner: {
    width: "100%",
    maxWidth: MAX_WIDTH,
    alignSelf: "center",
    paddingHorizontal: theme.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  logo: { width: 28, height: 28, borderRadius: 8, backgroundColor: theme.colors.accent, alignItems: "center", justifyContent: "center" },
  brand: { color: theme.colors.text, fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
  signOut: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  signOutText: { color: theme.colors.muted, fontSize: 13, fontWeight: "500" },
  container: { flex: 1, width: "100%", maxWidth: MAX_WIDTH, alignSelf: "center", paddingHorizontal: theme.spacing.lg },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    overflow: "hidden",
  },
  bannerTitle: { color: theme.colors.text, fontSize: 26, fontWeight: "700", letterSpacing: -0.6 },
  bannerText: { color: theme.colors.muted, fontSize: 14, lineHeight: 20, marginTop: 6, maxWidth: 420 },
  bannerImage: { width: 92, height: 92, transform: [{ rotate: "8deg" }] },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    borderRadius: theme.radius,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: theme.spacing.lg,
  },
  noticeOk: { borderColor: "rgba(201,162,75,0.5)", backgroundColor: theme.colors.accentSoft },
  noticeError: { borderColor: "rgba(242,139,130,0.45)", backgroundColor: "rgba(242,139,130,0.08)" },
  noticeText: { flex: 1, fontSize: 14, fontWeight: "500" },
  list: { paddingBottom: 140, gap: theme.spacing.md },
  row: { gap: theme.spacing.md },
  card: {
    flex: 1,
    backgroundColor: theme.colors.backgroundDeep,
    borderRadius: theme.radiusLg,
    borderWidth: 2,
    borderColor: theme.colors.backgroundDeep,
    overflow: "hidden",
  },
  cardOn: { borderColor: theme.colors.accent },
  cardLocked: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.98 }] },
  imageWrap: { aspectRatio: 1, backgroundColor: theme.colors.surface, padding: theme.spacing.md },
  image: { width: "100%", height: "100%" },
  check: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(10,20,40,0.6)",
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  checkText: { color: theme.colors.backgroundDeep, fontWeight: "800", fontSize: 13 },
  lowPill: {
    position: "absolute",
    left: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: theme.colors.accent,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  lowPillText: { color: theme.colors.backgroundDeep, fontSize: 11, fontWeight: "700" },
  cardBody: { padding: 12, paddingBottom: 14 },
  cardTitle: { color: theme.colors.text, fontSize: 14, fontWeight: "500", lineHeight: 19, minHeight: 38 },
  cardMeta: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 8, gap: 6 },
  price: { color: theme.colors.text, fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"] },
  stock: { color: theme.colors.muted, fontSize: 12, fontVariant: ["tabular-nums"] },
  skeletonGrid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: theme.colors.surface, marginTop: 8, width: "80%" },
  empty: { alignItems: "center", paddingVertical: 64 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
  },
  emptyTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "600" },
  emptyText: { color: theme.colors.muted, fontSize: 14, marginTop: theme.spacing.sm, textAlign: "center" },
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
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 14,
    paddingBottom: 30,
  },
  barLeft: { flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 1 },
  thumbs: { flexDirection: "row" },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 2,
    borderColor: theme.colors.backgroundDeep,
    padding: 4,
  },
  thumbEmpty: { backgroundColor: theme.colors.surface, borderStyle: "dashed", borderColor: theme.colors.border },
  thumbImage: { width: "100%", height: "100%" },
  barCount: { color: theme.colors.text, fontSize: 14, fontWeight: "600", fontVariant: ["tabular-nums"] },
  barHint: { color: theme.colors.muted, fontSize: 12, marginTop: 2 },
  button: { backgroundColor: theme.colors.accent, borderRadius: theme.radius, paddingVertical: 14, paddingHorizontal: 28, alignItems: "center", minWidth: 120 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: theme.colors.backgroundDeep, fontSize: 16, fontWeight: "700" },
});
