import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme";

type Props = { onLogout: () => void };

export default function ItemsScreen(_: Props) {
  // TODO: list GET /skus, select up to two, Confirm -> POST /selections, refresh
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Items</Text>
      <Text style={styles.hint}>Build me.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.lg },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: "600", marginBottom: theme.spacing.md },
  hint: { color: theme.colors.muted },
});
