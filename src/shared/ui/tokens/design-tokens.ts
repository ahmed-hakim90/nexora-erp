export const typographyScale = {
  xs: "0.75rem",
  sm: "0.875rem",
  base: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
  "2xl": "1.5rem",
  "3xl": "1.875rem",
} as const;

export const spacingScale = {
  0: "0",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  6: "1.5rem",
  8: "2rem",
  12: "3rem",
} as const;

export const radiusScale = {
  none: "0",
  sm: "0.25rem",
  md: "0.5rem",
  lg: "0.5rem",
  xl: "0.75rem",
  full: "9999px",
} as const;

export const shadowScale = {
  none: "none",
  sm: "0 1px 2px rgb(15 23 42 / 0.08)",
  md: "0 8px 24px rgb(15 23 42 / 0.12)",
  lg: "0 16px 48px rgb(15 23 42 / 0.16)",
} as const;

export const motionDurations = {
  instant: "0ms",
  fast: "120ms",
  normal: "200ms",
  slow: "320ms",
} as const;

export const motionEasing = {
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  emphasized: "cubic-bezier(0.2, 0, 0, 1.2)",
} as const;

export const zIndexLayers = {
  base: 0,
  sticky: 20,
  dropdown: 40,
  overlay: 50,
  modal: 60,
  toast: 70,
} as const;

export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

export const containerWidths = {
  sm: "40rem",
  md: "48rem",
  lg: "64rem",
  xl: "80rem",
  full: "100%",
} as const;
