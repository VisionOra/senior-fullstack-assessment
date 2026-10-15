import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  Pressable,
  FlatList,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";
import { api } from "../api";
import { categories, Category } from "../components/assets";

type Sku = {
  id: number;
  title: string;
  price: string | null;
  thumbnail: string | null;
  category: string | null;
  quantity: number;
};
type Props = { email: string; initialCategory: Category; onLogout: () => void };
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
  return price === null ? null : `$${Number(price).toFixed(2)}`;
}

export default function ItemsScreen({ email, initialCategory, onLogout }: Props) {
  const { width } = useWindowDimensions();
  const columns = columnsFor(Math.min(width, MAX_WIDTH));
  const [skus, setSkus] = useState<Sku[] | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [category, setCategory] = useState<Category>(initialCategory);
  const [query, setQuery] = useState("");
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

  const visible = useMemo(() => {
    if (!skus) return [];
    const q = query.trim().toLowerCase();
    return skus.filter((s) => (category === "all" || s.category === category) && (!q || s.title.toLowerCase().includes(q)));
  }, [skus, category, query]);

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

  const initial = (email[0] || "?").toUpperCase();
  const name = email.split("@")[0] || "there";

  const header = (
    <View>
      <View style={styles.topRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>Hello,</Text>
          <Text style={styles.helloName} numberOfLines={1}>{name}</Text>
        </View>
        <Pressable
          onPress={onLogout}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="log-out-outline" size={20} color={theme.colors.ink} />
        </Pressable>
      </View>

      <Text style={styles.title}>Discover</Text>
      <Text style={styles.titleMuted}>What is still on the shelf</Text>

      <View style={styles.search}>
        <Ionicons name="search" size={18} color={theme.colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search items"
          placeholderTextColor={theme.colors.subtle}
          style={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={10} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={theme.colors.subtle} />
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsWrap}>
        {[{ key: "all" as Category, label: "All" }, ...categories].map((c) => {
          const active = category === c.key;
          return (
            <Pressable
              key={c.key}
              onPress={() => setCategory(c.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {notice && (
        <View style={[styles.notice, notice.kind === "error" ? styles.noticeError : styles.noticeOk]} accessibilityLiveRegion="polite">
          <Ionicons
            name={notice.kind === "error" ? "alert-circle" : "checkmark-circle"}
            size={18}
            color={notice.kind === "error" ? theme.colors.danger : theme.colors.ink}
          />
          <Text style={[styles.noticeText, notice.kind === "error" && { color: theme.colors.danger }]}>{notice.text}</Text>
          <Pressable onPress={() => setNotice(null)} hitSlop={10} accessibilityLabel="Dismiss">
            <Ionicons name="close" size={16} color={theme.colors.muted} />
          </Pressable>
        </View>
      )}
    </View>
  );

  const soldOut = skus !== null && skus.length === 0;

  return (
    <View style={styles.root}>
      <View style={styles.container}>
        {skus === null ? (
          <>
            {header}
            <SkeletonGrid columns={columns} />
          </>
        ) : (
          <FlatList
            key={columns}
            data={visible}
            keyExtractor={(s) => String(s.id)}
            numColumns={columns}
            renderItem={renderItem}
            extraData={order}
            ListHeaderComponent={header}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            initialNumToRender={12}
            windowSize={5}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.ink} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name={soldOut ? "cube-outline" : "search-outline"} size={26} color={theme.colors.ink} />
                </View>
                <Text style={styles.emptyTitle}>{soldOut ? "The shelf is empty" : "No matches"}</Text>
                <Text style={styles.emptyText}>
                  {soldOut ? "Every item has sold out. Pull down to check again." : "Try another category or search term."}
                </Text>
              </View>
            }
          />
        )}
      </View>

      <View style={styles.barWrap} pointerEvents="box-none">
        <View style={styles.bar}>
          <View style={styles.thumbs}>
            {Array.from({ length: MAX_SELECTED }).map((_, i) => {
              const sku = picked[i];
              return (
                <View key={i} style={[styles.thumb, i > 0 && { marginLeft: -12 }, !sku && styles.thumbEmpty]}>
                  {sku?.thumbnail ? <Image source={{ uri: sku.thumbnail }} style={styles.thumbImage} resizeMode="contain" /> : null}
                </View>
              );
            })}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.barCount}>
              {selected.length} of {MAX_SELECTED} selected
            </Text>
            <Text style={styles.barHint} numberOfLines={1}>
              {full ? "Limit reached" : selected.length ? "Add one more or confirm" : "Tap the bag to pick"}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: selected.length === 0 || busy }}
            style={({ pressed }) => [styles.button, (selected.length === 0 || busy) && styles.buttonDisabled, pressed && styles.pressed]}
            onPress={confirm}
            disabled={selected.length === 0 || busy}
          >
            {busy ? <ActivityIndicator color={theme.colors.ink} /> : <Text style={styles.buttonText}>Confirm</Text>}
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
      style={({ pressed }) => [styles.card, locked && styles.cardLocked, pressed && styles.pressed]}
    >
      <View style={[styles.imageWrap, on && styles.imageWrapOn]}>
        {sku.thumbnail ? <Image source={{ uri: sku.thumbnail }} style={styles.image} resizeMode="contain" /> : null}
        {low && (
          <View style={styles.lowPill}>
            <Text style={styles.lowPillText}>Only {sku.quantity} left</Text>
          </View>
        )}
        <View style={[styles.bag, on && styles.bagOn]}>
          {on ? (
            <Text style={styles.bagText}>{position}</Text>
          ) : (
            <Ionicons name="bag-add-outline" size={18} color={theme.colors.onInk} />
          )}
        </View>
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>{sku.title}</Text>
      <View style={styles.cardMeta}>
        {price && <Text style={styles.price}>{price}</Text>}
        {!low && <Text style={styles.stock}>{sku.quantity} in stock</Text>}
      </View>
    </Pressable>
  );
});

function SkeletonGrid({ columns }: { columns: number }) {
  return (
    <View style={styles.skeletonGrid}>
      {Array.from({ length: columns * 2 }).map((_, i) => (
        <View key={i} style={{ flexBasis: `${100 / columns - 4}%`, flexGrow: 1 }}>
          <View style={[styles.imageWrap, { opacity: 0.7 }]} />
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, { width: "40%" }]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  container: { flex: 1, width: "100%", maxWidth: MAX_WIDTH, alignSelf: "center", paddingHorizontal: 20 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 60 },
  avatar: { width: 46, height: 46, borderRadius: 16, backgroundColor: theme.colors.ink, alignItems: "center", justifyContent: "center" },
  avatarText: { color: theme.colors.accent, fontSize: 18, fontWeight: "800" },
  hello: { color: theme.colors.muted, fontSize: 13 },
  helloName: { color: theme.colors.ink, fontSize: 16, fontWeight: "700" },
  iconButton: { width: 46, height: 46, borderRadius: 16, backgroundColor: theme.colors.card, alignItems: "center", justifyContent: "center" },
  title: { color: theme.colors.ink, fontSize: 34, fontWeight: "800", letterSpacing: -1, marginTop: 28 },
  titleMuted: { color: theme.colors.muted, fontSize: 24, fontWeight: "500", letterSpacing: -0.6, marginTop: 2 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: theme.colors.card,
    borderRadius: 999,
    paddingHorizontal: 18,
    marginTop: 22,
  },
  searchInput: { flex: 1, color: theme.colors.ink, fontSize: 15, paddingVertical: 15, outlineStyle: "none" } as any,
  chipsWrap: { marginTop: 16, marginHorizontal: -20 },
  chips: { gap: 10, paddingHorizontal: 20 },
  chip: { paddingVertical: 11, paddingHorizontal: 20, borderRadius: 999, backgroundColor: theme.colors.card },
  chipActive: { backgroundColor: theme.colors.ink },
  chipText: { color: theme.colors.ink, fontSize: 14, fontWeight: "600" },
  chipTextActive: { color: theme.colors.onInk },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    borderRadius: theme.radius + 2,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 16,
  },
  noticeOk: { backgroundColor: theme.colors.accentSoft },
  noticeError: { backgroundColor: theme.colors.dangerSoft },
  noticeText: { flex: 1, color: theme.colors.ink, fontSize: 14, fontWeight: "600" },
  list: { paddingBottom: 150, gap: 22 },
  row: { gap: 14 },
  card: { flex: 1 },
  cardLocked: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.98 }] },
  imageWrap: {
    aspectRatio: 0.9,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radiusLg,
    padding: 18,
    borderWidth: 2,
    borderColor: theme.colors.card,
  },
  imageWrapOn: { borderColor: theme.colors.accent },
  image: { width: "100%", height: "100%" },
  lowPill: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: theme.colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  lowPillText: { color: "#7A5B14", fontSize: 11, fontWeight: "700" },
  bag: {
    position: "absolute",
    bottom: -18,
    alignSelf: "center",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.ink,
    borderWidth: 3,
    borderColor: theme.colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  bagOn: { backgroundColor: theme.colors.accent },
  bagText: { color: theme.colors.ink, fontWeight: "800", fontSize: 15 },
  cardTitle: { color: theme.colors.ink, fontSize: 14, fontWeight: "600", textAlign: "center", marginTop: 26, paddingHorizontal: 4 },
  cardMeta: { flexDirection: "row", justifyContent: "center", alignItems: "baseline", gap: 8, marginTop: 4 },
  price: { color: theme.colors.ink, fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"] },
  stock: { color: theme.colors.muted, fontSize: 12, fontVariant: ["tabular-nums"] },
  skeletonGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 22 },
  skeletonLine: { height: 10, borderRadius: 5, backgroundColor: theme.colors.tile, marginTop: 12, width: "70%", alignSelf: "center" },
  empty: { alignItems: "center", paddingVertical: 56 },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: theme.colors.card, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyTitle: { color: theme.colors.ink, fontSize: 18, fontWeight: "700" },
  emptyText: { color: theme.colors.muted, fontSize: 14, marginTop: 6, textAlign: "center" },
  barWrap: { position: "absolute", left: 0, right: 0, bottom: 28, alignItems: "center", paddingHorizontal: 16 },
  bar: {
    width: "100%",
    maxWidth: 560,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.colors.ink,
    borderRadius: 26,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 10,
    shadowColor: theme.colors.inkDeep,
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  thumbs: { flexDirection: "row" },
  thumb: { width: 42, height: 42, borderRadius: 14, backgroundColor: theme.colors.card, borderWidth: 2, borderColor: theme.colors.ink, padding: 4 },
  thumbEmpty: { backgroundColor: "rgba(245,241,230,0.12)", borderStyle: "dashed", borderColor: "rgba(245,241,230,0.35)" },
  thumbImage: { width: "100%", height: "100%" },
  barCount: { color: theme.colors.onInk, fontSize: 14, fontWeight: "700", fontVariant: ["tabular-nums"] },
  barHint: { color: theme.colors.subtle, fontSize: 12, marginTop: 2 },
  button: { backgroundColor: theme.colors.accent, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 22, alignItems: "center", minWidth: 110 },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: theme.colors.ink, fontSize: 15, fontWeight: "800" },
});
