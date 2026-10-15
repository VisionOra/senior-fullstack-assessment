import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";

export const sortOptions = [
  { key: "featured", label: "Featured", icon: "sparkles-outline" },
  { key: "price-asc", label: "Price: low to high", icon: "trending-up-outline" },
  { key: "price-desc", label: "Price: high to low", icon: "trending-down-outline" },
  { key: "stock-asc", label: "Fewest left first", icon: "hourglass-outline" },
] as const;

export type SortKey = (typeof sortOptions)[number]["key"];

type Props = {
  visible: boolean;
  sort: SortKey;
  lowOnly: boolean;
  onSort: (key: SortKey) => void;
  onLowOnly: (value: boolean) => void;
  onClose: () => void;
};

export default function SortSheet({ visible, sort, lowOnly, onSort, onLowOnly, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close filters" />
      <View style={styles.sheet}>
        <View style={styles.inner}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Sort and filter</Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.close} accessibilityLabel="Close">
              <Ionicons name="close" size={18} color={theme.colors.ink} />
            </Pressable>
          </View>

          <Text style={styles.section}>Sort by</Text>
          {sortOptions.map((o) => {
            const active = sort === o.key;
            return (
              <Pressable
                key={o.key}
                onPress={() => onSort(o.key)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                style={[styles.option, active && styles.optionActive]}
              >
                <Ionicons name={o.icon} size={18} color={theme.colors.ink} />
                <Text style={styles.optionText}>{o.label}</Text>
                <Ionicons
                  name={active ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={active ? theme.colors.ink : theme.colors.subtle}
                />
              </Pressable>
            );
          })}

          <Text style={styles.section}>Filter</Text>
          <Pressable
            onPress={() => onLowOnly(!lowOnly)}
            accessibilityRole="switch"
            accessibilityState={{ checked: lowOnly }}
            style={styles.option}
          >
            <Ionicons name="flash-outline" size={18} color={theme.colors.ink} />
            <Text style={styles.optionText}>Only items with fewer than 50 left</Text>
            <View style={[styles.switch, lowOnly && styles.switchOn]}>
              <View style={[styles.knob, lowOnly && styles.knobOn]} />
            </View>
          </Pressable>

          <Pressable onPress={onClose} style={({ pressed }) => [styles.apply, pressed && { transform: [{ scale: 0.98 }] }]}>
            <Text style={styles.applyText}>Show results</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(10,20,40,0.45)" },
  sheet: { backgroundColor: theme.colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 36 },
  inner: { width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 20 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: theme.colors.border, alignSelf: "center", marginTop: 10 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, marginBottom: 8 },
  title: { color: theme.colors.ink, fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.colors.card, alignItems: "center", justifyContent: "center" },
  section: { color: theme.colors.muted, fontSize: 13, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  optionActive: { borderColor: theme.colors.ink },
  optionText: { flex: 1, color: theme.colors.ink, fontSize: 15, fontWeight: "600" },
  switch: { width: 44, height: 26, borderRadius: 13, backgroundColor: theme.colors.border, padding: 3 },
  switchOn: { backgroundColor: theme.colors.ink },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: theme.colors.card },
  knobOn: { transform: [{ translateX: 18 }], backgroundColor: theme.colors.accent },
  apply: { backgroundColor: theme.colors.ink, borderRadius: 999, paddingVertical: 16, alignItems: "center", marginTop: 16 },
  applyText: { color: theme.colors.onInk, fontSize: 16, fontWeight: "700" },
});
