import React from "react";
import { Image, ImageSourcePropType, StyleSheet, View, ViewStyle } from "react-native";
import { theme } from "../theme";

type Props = { source: ImageSourcePropType; size: number; rotate?: number; style?: ViewStyle };

export default function ProductTile({ source, size, rotate = 0, style }: Props) {
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: size * 0.22, transform: [{ rotate: `${rotate}deg` }] },
        style,
      ]}
    >
      <Image source={source} style={styles.image} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    shadowColor: "#050B18",
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  image: { width: "100%", height: "100%" },
});
