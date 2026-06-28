/*
 * Programmatic mirror of the Enterprise Design System tokens.
 * The canonical runtime source is src/app/globals.css (@theme + :root).
 * These constants exist for non-CSS consumers (charts, canvas, computed styles).
 * See docs/ENTERPRISE_DESIGN_SYSTEM.md.
 */

export const typographyScale = {
  xs: "12px",
  sm: "14px",
  md: "16px",
  lg: "18px",
  xl: "20px",
  "2xl": "24px",
  "3xl": "30px",
  "4xl": "36px",
} as const;

export const lineHeights = {
  tight: "1.2",
  normal: "1.5",
  relaxed: "1.7",
} as const;

export const spacingScale = {
  0: "0",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
} as const;

export const radiusScale = {
  none: "0",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  "2xl": "24px",
  full: "9999px",
} as const;

export const shadowScale = {
  none: "none",
  sm: "0 1px 2px rgba(15, 23, 42, 0.05)",
  md: "0 8px 24px rgba(15, 23, 42, 0.08)",
  lg: "0 20px 40px rgba(15, 23, 42, 0.12)",
} as const;

export const semanticColors = {
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#DC2626",
  info: "#0EA5E9",
} as const;

export const brandColors = {
  primary500: "#2563EB",
  primary600: "#1D4ED8",
  primary700: "#1E40AF",
  secondary500: "#7C3AED",
  secondary600: "#6D28D9",
} as const;

export const moduleAccents = {
  finance: "#2563EB",
  inventory: "#10B981",
  manufacturing: "#F97316",
  purchasing: "#06B6D4",
  sales: "#8B5CF6",
  crm: "#EC4899",
  hr: "#14B8A6",
  payroll: "#0EA5E9",
  fleet: "#F59E0B",
  service: "#EF4444",
  projects: "#6366F1",
  quality: "#84CC16",
} as const;

export const moduleGradients = {
  finance: "linear-gradient(135deg, #2563EB, #3B82F6)",
  inventory: "linear-gradient(135deg, #059669, #10B981)",
  manufacturing: "linear-gradient(135deg, #EA580C, #F97316)",
  automation: "linear-gradient(135deg, #7C3AED, #A855F7)",
  system: "linear-gradient(135deg, #0F172A, #334155)",
} as const;

export type ModuleAccentKey = keyof typeof moduleAccents;

export const motionDurations = {
  instant: "0ms",
  fast: "150ms",
  normal: "200ms",
  slow: "250ms",
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

export const shellDimensions = {
  topbarHeight: "64px",
  sidebarExpanded: "280px",
  sidebarCollapsed: "72px",
  workspacePadding: "24px",
} as const;
