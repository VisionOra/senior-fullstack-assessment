import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme, brand } from "../theme";
import ProductTile from "../components/ProductTile";
import { productArt } from "../components/assets";

type Props = { onDone: () => void };

type Slide = { key: string; title: string; body: string; visual: (size: number) => React.ReactNode };

const slides: Slide[] = [
  {
    key: "browse",
    title: "Small drops,\nreal stock",
    body: "Every item has a fixed number of units. What you see is what is left.",
    visual: (s) => (
      <View style={{ width: s, height: s }}>
        <ProductTile source={productArt.palette} size={s * 0.42} rotate={-8} style={{ position: "absolute", left: 0, top: s * 0.12 }} />
        <ProductTile source={productArt.sofa} size={s * 0.42} rotate={7} style={{ position: "absolute", right: 0, top: s * 0.04 }} />
        <ProductTile source={productArt.perfume} size={s * 0.52} style={{ position: "absolute", left: s * 0.24, bottom: 0 }} />
      </View>
    ),
  },
  {
    key: "pick",
    title: "Pick up to two",
    body: "Tap the items you want. Your picks are numbered so you always know what you are confirming.",
    visual: (s) => (
      <View style={{ width: s, height: s, alignItems: "center", justifyContent: "center" }}>
        <View style={{ flexDirection: "row", gap: s * 0.06 }}>
          {[productArt.lipstick, productArt.bloom].map((src, i) => (
            <View key={i}>
              <ProductTile source={src} size={s * 0.44} style={{ borderColor: theme.colors.accent, borderWidth: 2 }} />
              <View style={styles.pickBadge}>
                <Text style={styles.pickBadgeText}>{i + 1}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    ),
  },
  {
    key: "confirm",
    title: "Confirm before\nit is gone",
    body: "Stock is shared with everyone. When the last unit goes, the item disappears from the shelf.",
    visual: (s) => (
      <View style={{ width: s, height: s, alignItems: "center", justifyContent: "center" }}>
        <View style={[styles.ring, { width: s * 0.78, height: s * 0.78, borderRadius: s * 0.39 }]} />
        <ProductTile source={productArt.perfume} size={s * 0.5} />
        <View style={[styles.stockPill, { bottom: s * 0.1 }]}>
          <Ionicons name="flash" size={14} color={theme.colors.backgroundDeep} />
          <Text style={styles.stockPillText}>1 left</Text>
        </View>
      </View>
    ),
  },
];

export default function OnboardingScreen({ onDone }: Props) {
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const visual = Math.min(width - theme.spacing.xl * 2, height * 0.38, 340);
  const last = index === slides.length - 1;

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  }

  function next() {
    if (last) return onDone();
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  }

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <View style={styles.brandRow}>
          <View style={styles.logo}>
            <Ionicons name="bag-handle" size={16} color={theme.colors.backgroundDeep} />
          </View>
          <Text style={styles.brand}>{brand}</Text>
        </View>
        {!last && (
          <Pressable onPress={onDone} hitSlop={10} accessibilityRole="button">
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={styles.visual}>{item.visual(visual)}</View>
            <View style={styles.copy}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.progress} accessibilityLabel={`Step ${index + 1} of ${slides.length}`}>
          {slides.map((s, i) => (
            <View key={s.key} style={[styles.step, i === index && styles.stepActive]} />
          ))}
        </View>
        <Pressable
          onPress={next}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.98 }] }]}
        >
          <Text style={styles.ctaText}>{last ? "Get started" : "Next"}</Text>
          <Ionicons name="arrow-forward" size={18} color={theme.colors.backgroundDeep} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 60,
    paddingBottom: theme.spacing.sm,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  logo: { width: 28, height: 28, borderRadius: 8, backgroundColor: theme.colors.accent, alignItems: "center", justifyContent: "center" },
  brand: { color: theme.colors.text, fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
  skip: { color: theme.colors.muted, fontSize: 15, fontWeight: "500" },
  slide: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: theme.spacing.xl },
  visual: { flex: 1, alignItems: "center", justifyContent: "center", maxHeight: 420 },
  copy: { width: "100%", maxWidth: 480, paddingBottom: theme.spacing.lg },
  title: { color: theme.colors.text, fontSize: 34, lineHeight: 40, fontWeight: "700", letterSpacing: -0.8 },
  body: { color: theme.colors.muted, fontSize: 16, lineHeight: 24, marginTop: theme.spacing.md, maxWidth: 420 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: 48,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
  progress: { flexDirection: "row", gap: 6 },
  step: { width: 8, height: 4, borderRadius: 2, backgroundColor: theme.colors.border },
  stepActive: { width: 24, backgroundColor: theme.colors.accent },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.accent,
    paddingVertical: 15,
    paddingHorizontal: 26,
    borderRadius: 999,
  },
  ctaText: { color: theme.colors.backgroundDeep, fontSize: 16, fontWeight: "700" },
  pickBadge: {
    position: "absolute",
    top: -10,
    right: -10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: theme.colors.background,
  },
  pickBadgeText: { color: theme.colors.backgroundDeep, fontWeight: "800", fontSize: 13 },
  ring: { position: "absolute", borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.accentSoft },
  stockPill: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  stockPillText: { color: theme.colors.backgroundDeep, fontWeight: "700", fontSize: 13 },
});
