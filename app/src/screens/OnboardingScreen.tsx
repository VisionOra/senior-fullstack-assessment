import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme, brand } from "../theme";
import Collage from "../components/Collage";
import { categories, Category, productArt } from "../components/assets";

type Props = { onDone: (category: Category) => void };

const slides = ["shelf", "pick", "choose"] as const;
type Slide = (typeof slides)[number];

export default function OnboardingScreen({ onDone }: Props) {
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const visualWidth = Math.min(width, 560);
  const visualHeight = Math.min(height * 0.5, 470);
  const last = index === slides.length - 1;

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  }

  function goTo(i: number) {
    listRef.current?.scrollToOffset({ offset: i * width, animated: true });
    setIndex(i);
  }

  function renderVisual(slide: Slide) {
    if (slide === "shelf") return <Collage width={visualWidth} height={visualHeight} animated />;
    if (slide === "pick") {
      const card = Math.min(visualWidth * 0.36, 170);
      return (
        <View style={[styles.visualBox, { width: visualWidth, height: visualHeight }]}>
          <View style={[styles.blob, { width: card * 2.6, height: card * 2.6, borderRadius: card * 1.3 }]} />
          <View style={{ flexDirection: "row", gap: 16 }}>
            {[productArt.lipstick, productArt.jadore].map((src, i) => (
              <View key={i} style={{ transform: [{ rotate: i === 0 ? "-6deg" : "5deg" }, { translateY: i === 0 ? 0 : 24 }] }}>
                <View style={[styles.pickCard, { width: card, height: card * 1.2 }]}>
                  <Image source={src} style={styles.fill} resizeMode="contain" />
                </View>
                <View style={styles.pickBag}>
                  <Text style={styles.pickBagText}>{i + 1}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      );
    }
    const size = Math.min(visualWidth * 0.5, 230);
    return (
      <View style={[styles.visualBox, { width: visualWidth, height: visualHeight }]}>
        <View style={[styles.ring, { width: size * 1.55, height: size * 1.55, borderRadius: size }]} />
        <View style={[styles.ring, styles.ringInner, { width: size * 1.2, height: size * 1.2, borderRadius: size }]} />
        <View style={[styles.heroCard, { width: size, height: size * 1.15 }]}>
          <Image source={productArt.perfume} style={styles.fill} resizeMode="contain" />
        </View>
        <View style={[styles.lastPill, { top: visualHeight / 2 + size * 0.48 }]}>
          <Ionicons name="flash" size={14} color={theme.colors.accent} />
          <Text style={styles.lastPillText}>Last unit</Text>
        </View>
      </View>
    );
  }

  function renderCopy(slide: Slide) {
    if (slide === "shelf")
      return (
        <>
          <Text style={styles.title}>Small drops,{"\n"}real stock</Text>
          <Text style={styles.body}>Every item has a fixed number of units. What you see is what is left.</Text>
        </>
      );
    if (slide === "pick")
      return (
        <>
          <Text style={styles.title}>Pick up to two</Text>
          <Text style={styles.body}>Tap the bag on any item. Your picks are numbered so you always know what you are confirming.</Text>
        </>
      );
    return (
      <>
        <Text style={styles.title}>What are you{"\n"}shopping for?</Text>
        <View style={styles.grid}>
          {categories.map((c) => (
            <Pressable
              key={c.key}
              onPress={() => onDone(c.key)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.choice, pressed && styles.choicePressed]}
            >
              <Ionicons name={c.icon} size={18} color={theme.colors.ink} />
              <Text style={styles.choiceText}>{c.label}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => onDone("all")}
            accessibilityRole="button"
            style={({ pressed }) => [styles.choice, styles.choicePrimary, pressed && { transform: [{ scale: 0.98 }] }]}
          >
            <Text style={styles.choicePrimaryText}>Everything</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={slides as unknown as Slide[]}
        keyExtractor={(s) => s}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            {renderVisual(item)}
            <View style={styles.copy}>{renderCopy(item)}</View>
          </View>
        )}
      />

      <View style={styles.topRow} pointerEvents="box-none">
        <View style={styles.brandPill}>
          <View style={styles.logo}>
            <Ionicons name="bag-handle" size={13} color={theme.colors.accent} />
          </View>
          <Text style={styles.brand}>{brand}</Text>
        </View>
        {!last && (
          <Pressable onPress={() => onDone("all")} hitSlop={12} accessibilityRole="button" style={styles.skipPill}>
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.progress} accessibilityLabel={`Step ${index + 1} of ${slides.length}`}>
          {slides.map((s, i) => (
            <Pressable key={s} onPress={() => goTo(i)} hitSlop={6}>
              <View style={[styles.step, i === index && styles.stepActive]} />
            </Pressable>
          ))}
        </View>
        {!last && (
          <Pressable
            onPress={() => goTo(index + 1)}
            accessibilityRole="button"
            accessibilityLabel="Next"
            style={({ pressed }) => [styles.next, pressed && { transform: [{ scale: 0.96 }] }]}
          >
            <Ionicons name="arrow-forward" size={22} color={theme.colors.onInk} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  slide: { flex: 1, alignItems: "center" },
  visualBox: { alignItems: "center", justifyContent: "center" },
  fill: { width: "100%", height: "100%" },
  copy: { width: "100%", maxWidth: 480, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg, alignItems: "center" },
  title: { color: theme.colors.ink, fontSize: 32, lineHeight: 38, fontWeight: "800", letterSpacing: -0.9, textAlign: "center" },
  body: { color: theme.colors.muted, fontSize: 16, lineHeight: 23, textAlign: "center", marginTop: 14, maxWidth: 340 },
  topRow: {
    position: "absolute",
    top: 58,
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    alignSelf: "center",
    maxWidth: 560,
    width: "100%",
  },
  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 14,
    borderRadius: 999,
  },
  logo: { width: 26, height: 26, borderRadius: 13, backgroundColor: theme.colors.ink, alignItems: "center", justifyContent: "center" },
  brand: { color: theme.colors.ink, fontSize: 16, fontWeight: "700", letterSpacing: -0.3 },
  skipPill: { backgroundColor: theme.colors.card, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999 },
  skip: { color: theme.colors.ink, fontSize: 15, fontWeight: "600" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: 44,
    paddingTop: 12,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    minHeight: 120,
  },
  progress: { flexDirection: "row", gap: 6 },
  step: { width: 8, height: 6, borderRadius: 3, backgroundColor: theme.colors.border },
  stepActive: { width: 28, backgroundColor: theme.colors.ink },
  next: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.ink, alignItems: "center", justifyContent: "center" },
  blob: { position: "absolute", backgroundColor: theme.colors.accentSoft },
  pickCard: { backgroundColor: theme.colors.card, borderRadius: 24, padding: 18, borderWidth: 2, borderColor: theme.colors.accent },
  pickBag: {
    position: "absolute",
    bottom: -18,
    alignSelf: "center",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.accent,
    borderWidth: 3,
    borderColor: theme.colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  pickBagText: { color: theme.colors.ink, fontWeight: "800", fontSize: 15 },
  ring: { position: "absolute", borderWidth: 1, borderColor: theme.colors.border },
  ringInner: { backgroundColor: theme.colors.accentSoft, borderColor: "transparent" },
  heroCard: { backgroundColor: theme.colors.card, borderRadius: 28, padding: 22 },
  lastPill: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: theme.colors.ink,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  lastPillText: { color: theme.colors.onInk, fontWeight: "700", fontSize: 13 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 22, width: "100%" },
  choice: {
    flexGrow: 1,
    flexBasis: "45%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    paddingVertical: 15,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  choicePressed: { borderColor: theme.colors.accent, transform: [{ scale: 0.98 }] },
  choiceText: { color: theme.colors.ink, fontSize: 16, fontWeight: "600" },
  choicePrimary: { backgroundColor: theme.colors.ink, borderColor: theme.colors.ink },
  choicePrimaryText: { color: theme.colors.onInk, fontSize: 16, fontWeight: "700" },
});
