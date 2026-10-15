import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
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
import { theme, brand } from "../theme";
import { api } from "../api";
import { categories, Category } from "../components/assets";
import FlyingImage, { Flight, Rect } from "../components/FlyingImage";
import SortSheet, { SortKey, sortOptions } from "../components/SortSheet";

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
type Layout = "grid" | "list";

const MAX_SELECTED = 2;
const MAX_WIDTH = 1080;
const LOW_STOCK = 5;
const LOW_FILTER = 50;
const BAR_HIDDEN = 160;
const promoTints = ["#F1E5C6", "#E3E7EF", theme.colors.tile];

function columnsFor(width: number) {
  if (width >= 1000) return 4;
  if (width >= 680) return 3;
  return 2;
}

function formatPrice(price: string | null) {
  return price === null ? null : `$${Number(price).toFixed(2)}`;
}

function measure(view: View | null): Promise<Rect | null> {
  return new Promise((resolve) => {
    if (!view) return resolve(null);
    view.measureInWindow((x, y, width, height) => resolve(width ? { x, y, width, height } : null));
  });
}

function sortSkus(list: Sku[], sort: SortKey) {
  const price = (s: Sku) => Number(s.price ?? 0);
  const copy = [...list];
  if (sort === "price-asc") copy.sort((a, b) => price(a) - price(b));
  if (sort === "price-desc") copy.sort((a, b) => price(b) - price(a));
  if (sort === "stock-asc") copy.sort((a, b) => a.quantity - b.quantity);
  return copy;
}

export default function ItemsScreen({ email, initialCategory, onLogout }: Props) {
  const { width } = useWindowDimensions();
  const [layout, setLayout] = useState<Layout>("grid");
  const columns = layout === "list" ? 1 : columnsFor(Math.min(width, MAX_WIDTH));
  const [skus, setSkus] = useState<Sku[] | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [category, setCategory] = useState<Category>(initialCategory);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("featured");
  const [lowOnly, setLowOnly] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const rootRef = useRef<View>(null);
  const slotRefs = useRef<(View | null)[]>([]);
  const progress = useRef(new Animated.Value(0)).current;
  const bump = useRef(new Animated.Value(1)).current;
  const barY = useRef(new Animated.Value(BAR_HIDDEN)).current;
  const barYNow = useRef(BAR_HIDDEN);
  const reduceMotion = useRef(false);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    const id = barY.addListener(({ value }) => (barYNow.current = value));
    return () => barY.removeListener(id);
  }, [barY]);

  const hasPicks = selected.length > 0;
  useEffect(() => {
    Animated.spring(barY, {
      toValue: hasPicks ? 0 : BAR_HIDDEN,
      friction: 9,
      tension: 80,
      useNativeDriver: false,
    }).start();
  }, [hasPicks, barY]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((v) => (reduceMotion.current = v));
  }, []);

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

  const flyToBag = useCallback(
    async (id: number, uri: string, source: View | null) => {
      const slot = slotRefs.current[selectedRef.current.length - 1];
      const [from, to, origin] = await Promise.all([measure(source), measure(slot), measure(rootRef.current)]);
      if (!from || !to) return;
      const ox = origin?.x ?? 0;
      const oy = origin?.y ?? 0;
      progress.setValue(0);
      const settledY = to.y - barYNow.current;
      setFlight({ id, uri, from: { ...from, x: from.x - ox, y: from.y - oy }, to: { ...to, x: to.x - ox, y: settledY - oy } });
      Animated.timing(progress, { toValue: 1, duration: 620, easing: Easing.bezier(0.45, 0, 0.2, 1), useNativeDriver: true }).start(() => {
        setFlight(null);
        bump.setValue(0.9);
        Animated.spring(bump, { toValue: 1, friction: 4, tension: 220, useNativeDriver: true }).start();
      });
    },
    [progress, bump]
  );

  const toggle = useCallback(
    (sku: Sku, source: View | null) => {
      const prev = selectedRef.current;
      if (prev.includes(sku.id)) {
        setSelected(prev.filter((x) => x !== sku.id));
        return;
      }
      if (prev.length >= MAX_SELECTED) return;
      const next = [...prev, sku.id];
      selectedRef.current = next;
      setSelected(next);
      if (!reduceMotion.current && sku.thumbnail) flyToBag(sku.id, sku.thumbnail, source);
    },
    [flyToBag]
  );

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
    const filtered = skus.filter(
      (s) =>
        (category === "all" || s.category === category) &&
        (!q || s.title.toLowerCase().includes(q)) &&
        (!lowOnly || s.quantity < LOW_FILTER)
    );
    return sortSkus(filtered, sort);
  }, [skus, category, query, sort, lowOnly]);

  const lowest = useMemo(() => (skus && skus.length ? [...skus].sort((a, b) => a.quantity - b.quantity)[0] : null), [skus]);
  const categoryCounts = useMemo(() => {
    const counts: Record<string, { count: number; thumb: string | null }> = {};
    for (const s of skus ?? []) {
      if (!s.category) continue;
      counts[s.category] ??= { count: 0, thumb: s.thumbnail };
      counts[s.category].count += 1;
    }
    return counts;
  }, [skus]);

  const order = useMemo(() => new Map(selected.map((id, i) => [id, i + 1])), [selected]);
  const full = selected.length >= MAX_SELECTED;
  const picked = useMemo(() => selected.map((id) => skus?.find((s) => s.id === id)).filter(Boolean) as Sku[], [selected, skus]);
  const filtersActive = sort !== "featured" || lowOnly;

  const renderItem = useCallback(
    ({ item }: { item: Sku }) => {
      const props = { sku: item, position: order.get(item.id), locked: full && !order.has(item.id), onToggle: toggle };
      return layout === "list" ? <SkuRow {...props} /> : <SkuCard {...props} />;
    },
    [order, full, toggle, layout]
  );

  const initial = (email[0] || "?").toUpperCase();
  const name = email.split("@")[0] || "there";
  const showPromos = !query && skus !== null && skus.length > 0;

  const header = (
    <View>
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <View style={styles.logo}>
            <Ionicons name="bag-handle" size={16} color={theme.colors.accent} />
          </View>
          <Text style={styles.brand}>{brand}</Text>
        </View>
        <View style={styles.topActions}>
          <View style={styles.bagChip} accessibilityLabel={`${selected.length} in your bag`}>
            <Ionicons name="bag-outline" size={18} color={theme.colors.ink} />
            {selected.length > 0 && (
              <View style={styles.bagChipBadge}>
                <Text style={styles.bagChipBadgeText}>{selected.length}</Text>
              </View>
            )}
          </View>
          <Pressable
            onPress={() => setMenuOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="Account"
            style={({ pressed }) => [styles.avatar, pressed && { transform: [{ scale: 0.95 }] }]}
          >
            <Text style={styles.avatarText}>{initial}</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.hello}>Hi {name}</Text>
      <Text style={styles.title}>Discover</Text>
      <Text style={styles.titleMuted}>What is still on the shelf</Text>

      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={theme.colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search items"
            placeholderTextColor="#A3AAB8"
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
        <Pressable
          onPress={() => setSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Sort and filter"
          style={({ pressed }) => [styles.filterButton, pressed && { transform: [{ scale: 0.95 }] }]}
        >
          <Ionicons name="options-outline" size={20} color={theme.colors.onInk} />
          {filtersActive && <View style={styles.filterDot} />}
        </Pressable>
      </View>

      {showPromos && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={Math.min(width - 40, 340) + 12}
          decelerationRate="fast"
          contentContainerStyle={styles.promos}
          style={styles.promosWrap}
        >
          {lowest && (
            <Pressable
              onPress={() => {
                setSort("stock-asc");
                setCategory("all");
              }}
              style={[styles.promo, styles.promoDark, { width: Math.min(width - 40, 340) }]}
            >
              <View style={{ flex: 1 }}>
                <View style={styles.promoTag}>
                  <Ionicons name="flash" size={12} color={theme.colors.ink} />
                  <Text style={styles.promoTagText}>Lowest stock</Text>
                </View>
                <Text style={styles.promoTitleLight} numberOfLines={2}>{lowest.title}</Text>
                <Text style={styles.promoBodyLight}>Only {lowest.quantity} left for everyone</Text>
                <View style={styles.promoCta}>
                  <Text style={styles.promoCtaText}>See fewest left</Text>
                  <Ionicons name="arrow-forward" size={14} color={theme.colors.ink} />
                </View>
              </View>
              {lowest.thumbnail && <Image source={{ uri: lowest.thumbnail }} style={styles.promoImage} resizeMode="contain" />}
            </Pressable>
          )}
          {categories.map((c, i) => {
            const info = categoryCounts[c.key];
            if (!info) return null;
            return (
              <Pressable
                key={c.key}
                onPress={() => setCategory(c.key)}
                style={[styles.promo, { width: Math.min(width - 40, 340), backgroundColor: promoTints[i % promoTints.length] }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.promoEyebrow}>{info.count} in stock</Text>
                  <Text style={styles.promoTitle}>{c.label}</Text>
                  <View style={[styles.promoCta, styles.promoCtaDark]}>
                    <Text style={[styles.promoCtaText, { color: theme.colors.onInk }]}>Shop {c.label.toLowerCase()}</Text>
                    <Ionicons name="arrow-forward" size={14} color={theme.colors.onInk} />
                  </View>
                </View>
                {info.thumb && <Image source={{ uri: info.thumb }} style={styles.promoImage} resizeMode="contain" />}
              </Pressable>
            );
          })}
        </ScrollView>
      )}

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

      <View style={styles.toolbar}>
        <Text style={styles.count}>
          {visible.length} {visible.length === 1 ? "item" : "items"}
          {sort !== "featured" ? `  ·  ${sortOptions.find((o) => o.key === sort)?.label}` : ""}
        </Text>
        <View style={styles.segment}>
          {(["grid", "list"] as Layout[]).map((l) => (
            <Pressable
              key={l}
              onPress={() => setLayout(l)}
              accessibilityRole="button"
              accessibilityLabel={l === "grid" ? "Grid view" : "List view"}
              accessibilityState={{ selected: layout === l }}
              style={[styles.segmentItem, layout === l && styles.segmentActive]}
            >
              <Ionicons
                name={l === "grid" ? "grid-outline" : "list-outline"}
                size={17}
                color={layout === l ? theme.colors.onInk : theme.colors.ink}
              />
            </Pressable>
          ))}
        </View>
      </View>

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
    <View style={styles.root} ref={rootRef} collapsable={false}>
      <View style={styles.container}>
        {skus === null ? (
          <>
            {header}
            <SkeletonGrid columns={columns} />
          </>
        ) : (
          <FlatList
            key={`${layout}-${columns}`}
            data={visible}
            keyExtractor={(s) => String(s.id)}
            numColumns={columns}
            renderItem={renderItem}
            extraData={order}
            ListHeaderComponent={header}
            columnWrapperStyle={columns > 1 ? styles.row : undefined}
            contentContainerStyle={[styles.list, layout === "list" && { gap: 12 }]}
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
                  {soldOut ? "Every item has sold out. Pull down to check again." : "Try another category, search or filter."}
                </Text>
              </View>
            }
          />
        )}
      </View>

      <View style={styles.barWrap} pointerEvents="box-none">
        <Animated.View style={{ width: "100%", alignItems: "center", transform: [{ translateY: barY }] }}>
        <Animated.View style={[styles.bar, { transform: [{ scale: bump }] }]}>
          <View style={styles.thumbs}>
            {Array.from({ length: MAX_SELECTED }).map((_, i) => {
              const sku = picked[i];
              const hidden = !sku || flight?.id === sku.id;
              return (
                <View
                  key={i}
                  ref={(r) => (slotRefs.current[i] = r)}
                  collapsable={false}
                  style={[styles.thumb, i > 0 && { marginLeft: -12 }, hidden && styles.thumbEmpty]}
                >
                  {sku?.thumbnail && !hidden ? <Image source={{ uri: sku.thumbnail }} style={styles.thumbImage} resizeMode="contain" /> : null}
                </View>
              );
            })}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.barCount}>
              {selected.length} of {MAX_SELECTED} in your bag
            </Text>
            <Text style={styles.barHint} numberOfLines={1}>
              {full ? "Limit reached" : "Add one more or confirm"}
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
        </Animated.View>
        </Animated.View>
      </View>

      {menuOpen && (
        <>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} accessibilityLabel="Close menu" />
          <View style={styles.menuWrap} pointerEvents="box-none">
            <View style={styles.menu}>
              <View style={styles.menuHeader}>
                <View style={[styles.avatar, { width: 40, height: 40 }]}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuLabel}>Signed in as</Text>
                  <Text style={styles.menuEmail} numberOfLines={1}>{email}</Text>
                </View>
              </View>
              <Pressable
                onPress={onLogout}
                accessibilityRole="button"
                style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: theme.colors.bg }]}
              >
                <Ionicons name="log-out-outline" size={18} color={theme.colors.danger} />
                <Text style={styles.menuSignOut}>Sign out</Text>
              </Pressable>
            </View>
          </View>
        </>
      )}

      {flight && <FlyingImage flight={flight} progress={progress} />}

      <SortSheet
        visible={sheetOpen}
        sort={sort}
        lowOnly={lowOnly}
        onSort={setSort}
        onLowOnly={setLowOnly}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

type CardProps = { sku: Sku; position?: number; locked: boolean; onToggle: (sku: Sku, source: View | null) => void };

const SkuCard = memo(function SkuCard({ sku, position, locked, onToggle }: CardProps) {
  const on = position !== undefined;
  const low = sku.quantity <= LOW_STOCK;
  const price = formatPrice(sku.price);
  const imageRef = useRef<View>(null);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on, disabled: locked }}
      accessibilityLabel={`${sku.title}${price ? `, ${price}` : ""}, ${sku.quantity} left`}
      onPress={() => onToggle(sku, imageRef.current)}
      disabled={locked}
      style={({ pressed }) => [styles.card, locked && styles.cardLocked, pressed && styles.pressed]}
    >
      <View ref={imageRef} collapsable={false} style={[styles.imageWrap, on && styles.imageWrapOn]}>
        {sku.thumbnail ? <Image source={{ uri: sku.thumbnail }} style={styles.image} resizeMode="contain" /> : null}
        {low && (
          <View style={styles.lowPill}>
            <Text style={styles.lowPillText}>Only {sku.quantity} left</Text>
          </View>
        )}
        <View style={[styles.bag, on && styles.bagOn]}>
          {on ? <Text style={styles.bagText}>{position}</Text> : <Ionicons name="bag-add-outline" size={18} color={theme.colors.onInk} />}
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

const SkuRow = memo(function SkuRow({ sku, position, locked, onToggle }: CardProps) {
  const on = position !== undefined;
  const low = sku.quantity <= LOW_STOCK;
  const price = formatPrice(sku.price);
  const imageRef = useRef<View>(null);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on, disabled: locked }}
      accessibilityLabel={`${sku.title}${price ? `, ${price}` : ""}, ${sku.quantity} left`}
      onPress={() => onToggle(sku, imageRef.current)}
      disabled={locked}
      style={({ pressed }) => [styles.rowCard, on && styles.rowCardOn, locked && styles.cardLocked, pressed && styles.pressed]}
    >
      <View ref={imageRef} collapsable={false} style={styles.rowImage}>
        {sku.thumbnail ? <Image source={{ uri: sku.thumbnail }} style={styles.image} resizeMode="contain" /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowCategory}>{sku.category ?? ""}</Text>
        <Text style={styles.rowTitle} numberOfLines={2}>{sku.title}</Text>
        <View style={styles.rowMeta}>
          {price && <Text style={styles.price}>{price}</Text>}
          <Text style={[styles.stock, low && { color: "#7A5B14", fontWeight: "700" }]}>
            {low ? `Only ${sku.quantity} left` : `${sku.quantity} in stock`}
          </Text>
        </View>
      </View>
      <View style={[styles.rowBag, on && styles.bagOn]}>
        {on ? <Text style={styles.bagText}>{position}</Text> : <Ionicons name="bag-add-outline" size={18} color={theme.colors.onInk} />}
      </View>
    </Pressable>
  );
});

function SkeletonGrid({ columns }: { columns: number }) {
  return (
    <View style={styles.skeletonGrid}>
      {Array.from({ length: Math.max(columns, 2) * 2 }).map((_, i) => (
        <View key={i} style={{ flexBasis: `${100 / Math.max(columns, 2) - 4}%`, flexGrow: 1 }}>
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
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 58 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 38, height: 38, borderRadius: 13, backgroundColor: theme.colors.ink, alignItems: "center", justifyContent: "center" },
  brand: { color: theme.colors.ink, fontSize: 21, fontWeight: "800", letterSpacing: -0.6 },
  topActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  bagChip: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.card, alignItems: "center", justifyContent: "center" },
  bagChipBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: theme.colors.bg,
  },
  bagChipBadgeText: { color: theme.colors.ink, fontSize: 10, fontWeight: "800" },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.ink, alignItems: "center", justifyContent: "center" },
  avatarText: { color: theme.colors.accent, fontSize: 17, fontWeight: "800" },
  hello: { color: theme.colors.muted, fontSize: 15, fontWeight: "600", marginTop: 26 },
  menuWrap: { position: "absolute", top: 110, left: 0, right: 0, alignItems: "flex-end", paddingHorizontal: 20, maxWidth: MAX_WIDTH, width: "100%", alignSelf: "center" },
  menu: {
    width: 260,
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 8,
    shadowColor: theme.colors.inkDeep,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  menuHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border, marginBottom: 4 },
  menuLabel: { color: theme.colors.muted, fontSize: 11, fontWeight: "600" },
  menuEmail: { color: theme.colors.ink, fontSize: 14, fontWeight: "700" },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12 },
  menuSignOut: { color: theme.colors.danger, fontSize: 15, fontWeight: "700" },
  title: { color: theme.colors.ink, fontSize: 36, fontWeight: "800", letterSpacing: -1.2, marginTop: 2 },
  titleMuted: { color: theme.colors.muted, fontSize: 24, fontWeight: "500", letterSpacing: -0.6, marginTop: 2 },
  searchRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  search: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: theme.colors.card, borderRadius: 999, paddingHorizontal: 18 },
  searchInput: { flex: 1, color: theme.colors.ink, fontSize: 15, paddingVertical: 15, outlineStyle: "none" } as any,
  filterButton: { width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.ink, alignItems: "center", justifyContent: "center" },
  filterDot: { position: "absolute", top: 12, right: 13, width: 9, height: 9, borderRadius: 5, backgroundColor: theme.colors.accent, borderWidth: 1.5, borderColor: theme.colors.ink },
  promosWrap: { marginTop: 20, marginHorizontal: -20 },
  promos: { gap: 12, paddingHorizontal: 20 },
  promo: { flexDirection: "row", alignItems: "center", borderRadius: 24, padding: 18, minHeight: 150, overflow: "hidden" },
  promoDark: { backgroundColor: theme.colors.ink },
  promoTag: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: theme.colors.accent, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  promoTagText: { color: theme.colors.ink, fontSize: 11, fontWeight: "800" },
  promoTitleLight: { color: theme.colors.onInk, fontSize: 19, fontWeight: "800", letterSpacing: -0.4, marginTop: 10 },
  promoBodyLight: { color: theme.colors.subtle, fontSize: 13, marginTop: 4 },
  promoEyebrow: { color: theme.colors.muted, fontSize: 12, fontWeight: "700" },
  promoTitle: { color: theme.colors.ink, fontSize: 26, fontWeight: "800", letterSpacing: -0.7, marginTop: 4 },
  promoCta: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: theme.colors.accent, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginTop: 14 },
  promoCtaDark: { backgroundColor: theme.colors.ink },
  promoCtaText: { color: theme.colors.ink, fontSize: 13, fontWeight: "700" },
  promoImage: { width: 108, height: 108, marginLeft: 8, transform: [{ rotate: "-6deg" }] },
  chipsWrap: { marginTop: 18, marginHorizontal: -20 },
  chips: { gap: 10, paddingHorizontal: 20 },
  chip: { paddingVertical: 11, paddingHorizontal: 20, borderRadius: 999, backgroundColor: theme.colors.card },
  chipActive: { backgroundColor: theme.colors.ink },
  chipText: { color: theme.colors.ink, fontSize: 14, fontWeight: "600" },
  chipTextActive: { color: theme.colors.onInk },
  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18 },
  count: { color: theme.colors.muted, fontSize: 13, fontWeight: "600" },
  segment: { flexDirection: "row", backgroundColor: theme.colors.card, borderRadius: 999, padding: 3 },
  segmentItem: { width: 38, height: 32, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  segmentActive: { backgroundColor: theme.colors.ink },
  notice: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, borderRadius: theme.radius + 2, paddingVertical: 12, paddingHorizontal: 14, marginTop: 14 },
  noticeOk: { backgroundColor: theme.colors.accentSoft },
  noticeError: { backgroundColor: theme.colors.dangerSoft },
  noticeText: { flex: 1, color: theme.colors.ink, fontSize: 14, fontWeight: "600" },
  list: { paddingBottom: 150, gap: 22 },
  row: { gap: 14, marginTop: 0 },
  card: { flex: 1 },
  cardLocked: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.98 }] },
  imageWrap: { aspectRatio: 0.9, backgroundColor: theme.colors.card, borderRadius: theme.radiusLg, padding: 18, borderWidth: 2, borderColor: theme.colors.card },
  imageWrapOn: { borderColor: theme.colors.accent },
  image: { width: "100%", height: "100%" },
  lowPill: { position: "absolute", top: 10, left: 10, backgroundColor: theme.colors.accentSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
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
  rowCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: theme.colors.card, borderRadius: 22, padding: 10, paddingRight: 14, borderWidth: 2, borderColor: theme.colors.card },
  rowCardOn: { borderColor: theme.colors.accent },
  rowImage: { width: 92, height: 92, borderRadius: 16, backgroundColor: theme.colors.bg, padding: 10 },
  rowCategory: { color: theme.colors.muted, fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  rowTitle: { color: theme.colors.ink, fontSize: 15, fontWeight: "700", marginTop: 2 },
  rowMeta: { flexDirection: "row", alignItems: "baseline", gap: 10, marginTop: 6 },
  rowBag: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.ink, alignItems: "center", justifyContent: "center" },
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
