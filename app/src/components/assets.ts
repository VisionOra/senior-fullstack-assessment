export const productArt = {
  perfume: require("../../assets/products/perfume.webp"),
  lipstick: require("../../assets/products/lipstick.webp"),
  palette: require("../../assets/products/palette.webp"),
  sofa: require("../../assets/products/sofa.webp"),
  bloom: require("../../assets/products/bloom.webp"),
  mascara: require("../../assets/products/mascara.webp"),
  powder: require("../../assets/products/powder.webp"),
  nailpolish: require("../../assets/products/nailpolish.webp"),
  ckone: require("../../assets/products/ckone.webp"),
  jadore: require("../../assets/products/jadore.webp"),
  dolce: require("../../assets/products/dolce.webp"),
  bed: require("../../assets/products/bed.webp"),
};

export const collageColumns = [
  [productArt.ckone, productArt.mascara],
  [productArt.sofa, productArt.lipstick, productArt.powder],
  [productArt.palette, productArt.perfume, productArt.nailpolish],
  [productArt.jadore, productArt.bed, productArt.dolce],
  [productArt.bloom, productArt.lipstick],
];

export const categories = [
  { key: "beauty", label: "Beauty", icon: "color-palette-outline" },
  { key: "fragrances", label: "Fragrances", icon: "flower-outline" },
  { key: "furniture", label: "Furniture", icon: "bed-outline" },
] as const;

export type Category = (typeof categories)[number]["key"] | "all";
