import React from "react";
import { Animated, Image, StyleSheet } from "react-native";
import { theme } from "../theme";

export type Rect = { x: number; y: number; width: number; height: number };
export type Flight = { id: number; uri: string; from: Rect; to: Rect };

export default function FlyingImage({ flight, progress }: { flight: Flight; progress: Animated.Value }) {
  const { from, to } = flight;
  const dx = to.x + to.width / 2 - (from.x + from.width / 2);
  const dy = to.y + to.height / 2 - (from.y + from.height / 2);
  const scale = to.width / from.width;
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
  const translateY = progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, -40, dy] });
  const s = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [1, 1.06, scale] });
  const opacity = progress.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0.6] });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.flyer,
        { left: from.x, top: from.y, width: from.width, height: from.height, opacity, transform: [{ translateX }, { translateY }, { scale: s }] },
      ]}
    >
      <Image source={{ uri: flight.uri }} style={styles.image} resizeMode="contain" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flyer: {
    position: "absolute",
    backgroundColor: theme.colors.card,
    borderRadius: theme.radiusLg,
    padding: 14,
    shadowColor: theme.colors.inkDeep,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  image: { width: "100%", height: "100%" },
});
