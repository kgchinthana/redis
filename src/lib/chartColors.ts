// Dark-mode categorical palette, validated for CVD-safe adjacent contrast
// against this app's card surface (#18181b). Order is the safety mechanism —
// do not reorder or cycle independently per chart.
export const CATEGORICAL = [
  "#3987e5", // 1 blue
  "#d95926", // 2 orange
  "#199e70", // 3 aqua
  "#c98500", // 4 yellow
  "#d55181", // 5 magenta
  "#008300", // 6 green
  "#9085e9", // 7 violet
  "#e66767", // 8 red
];

export const SEQUENTIAL_BLUE = {
  100: "#cde2fb",
  300: "#6da7ec",
  400: "#3987e5",
  500: "#256abf",
  700: "#0d366b",
};

export const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
};

export const CHART_INK = {
  primary: "#ffffff",
  secondary: "#c3c2b7",
  muted: "#898781",
  grid: "#2c2c2a",
  baseline: "#383835",
};

// Fixed mapping so a key's type badge, the type-distribution donut, and any
// other chart always render the same type in the same color.
export const TYPE_COLORS: Record<string, string> = {
  string: CATEGORICAL[0],
  hash: CATEGORICAL[2],
  list: CATEGORICAL[1],
  set: CATEGORICAL[3],
  zset: CATEGORICAL[6],
  stream: CATEGORICAL[4],
  other: CATEGORICAL[5],
};

export function colorForType(type: string): string {
  return TYPE_COLORS[type] ?? TYPE_COLORS.other;
}
