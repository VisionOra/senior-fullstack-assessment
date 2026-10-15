const palette = {
  navy: "#0F1E3D",
  navyDeep: "#0A1428",
  gold: "#C9A24B",
  cream: "#F5F1E6",
  slate: "#9AA4B8",
};

export const theme = {
  palette,
  colors: {
    bg: palette.cream,
    card: "#FFFDF8",
    tile: "#ECE6D6",
    ink: palette.navy,
    inkDeep: palette.navyDeep,
    onInk: palette.cream,
    muted: "#5B667C",
    subtle: palette.slate,
    accent: palette.gold,
    accentSoft: "rgba(201,162,75,0.16)",
    border: "#E2DBCB",
    danger: "#B3261E",
    dangerSoft: "rgba(179,38,30,0.07)",
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: 12,
  radiusLg: 22,
};

export const brand = "Shelf";
