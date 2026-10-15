import React, { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, View } from "react-native";
import { theme } from "../theme";
import { collageColumns } from "./assets";

const tints = [theme.colors.card, theme.colors.tile, "#F1E5C6", "#E3E7EF"];
const offsets = [0.55, 0.15, -0.25, 0.3, 0.75];
const durations = [7000, 9000, 8000, 9500, 7500];

type Props = { width: number; height: number; animated?: boolean };

export default function Collage({ width, height, animated = false }: Props) {
  const tile = Math.round(width / 3.6);
  const gap = Math.round(tile * 0.1);
  const drift = tile * 0.45;
  const values = useRef(collageColumns.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!animated) return;
    let loops: Animated.CompositeAnimation[] = [];
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce || cancelled) return;
      loops = values.map((v, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(v, { toValue: 1, duration: durations[i], easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(v, { toValue: 0, duration: durations[i], easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ])
        )
      );
      loops.forEach((l) => l.start());
    });
    return () => {
      cancelled = true;
      loops.forEach((l) => l.stop());
    };
  }, [animated, values]);

  return (
    <View style={[styles.root, { width, height }]} pointerEvents="none">
      <View style={[styles.columns, { gap, marginLeft: -(tile * 5 + gap * 4 - width) / 2 }]}>
        {collageColumns.map((column, c) => {
          const direction = c % 2 === 0 ? -1 : 1;
          const translateY = values[c].interpolate({ inputRange: [0, 1], outputRange: [0, direction * drift] });
          const tiles = animated ? [...column, column[0]] : column;
          return (
            <Animated.View key={c} style={{ gap, marginTop: (offsets[c] - (animated ? 0.5 : 0)) * tile, transform: [{ translateY }] }}>
              {tiles.map((src, i) => (
                <View
                  key={i}
                  style={[
                    styles.tile,
                    { width: tile, height: tile * 1.3, borderRadius: tile * 0.2, backgroundColor: tints[(c + i) % tints.length] },
                  ]}
                >
                  <Image source={src} style={styles.image} resizeMode="contain" />
                </View>
              ))}
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: "hidden" },
  columns: { flexDirection: "row", alignItems: "flex-start" },
  tile: { padding: 12 },
  image: { width: "100%", height: "100%" },
});
