/*
 * Manufacturing Targets workspace model.
 *
 * Browser-safe: this module is consumed by a client component, so it must not
 * import server-only adapters (no manufacturing/public-api barrel). It exposes
 * fact-only mock data and pure helpers. No incentive, payroll, or costing logic
 * is implemented here — targets and achievement are production facts only.
 */

export type AchievementTone = "success" | "warning" | "danger" | "neutral";

export type TargetPeriod = Readonly<{ key: string; label: string }>;

export const TARGET_PERIODS: readonly TargetPeriod[] = [
  { key: "2026-06", label: "June 2026" },
  { key: "2026-05", label: "May 2026" },
  { key: "2026-q2", label: "Q2 2026" },
];

export const TARGET_TABS = [
  "Product Targets",
  "Line Targets",
  "Worker Targets",
  "Plan Achievement",
  "Line Achievement",
  "Worker Achievement",
  "Monthly Achievement",
  "Supervisor KPIs",
] as const;

export type TargetTab = (typeof TARGET_TABS)[number];

export type ProductTargetRecord = Readonly<{
  key: string;
  product: string;
  line: string;
  unit: string;
  planned: number;
  actual: number;
}>;

export type LineTargetRecord = Readonly<{
  key: string;
  line: string;
  shift: string;
  planned: number;
  actual: number;
}>;

export type WorkerTargetRecord = Readonly<{
  key: string;
  worker: string;
  line: string;
  role: string;
  planned: number;
  actual: number;
}>;

export type AchievementRecord = Readonly<{
  key: string;
  label: string;
  context: string;
  planned: number;
  actual: number;
}>;

export type MonthlyAchievementRecord = Readonly<{
  key: string;
  month: string;
  planned: number;
  actual: number;
}>;

export type SupervisorKpiRecord = Readonly<{
  key: string;
  supervisor: string;
  lines: number;
  dprCompletion: number;
  achievement: number;
  scrapRate: number;
}>;

export const PRODUCT_TARGETS: readonly ProductTargetRecord[] = [
  { actual: 9120, key: "pt-1", line: "Injection Line 1", planned: 9600, product: "Bottle Cap 28mm", unit: "pcs" },
  { actual: 7430, key: "pt-2", line: "Injection Line 2", planned: 7000, product: "Preform 23g", unit: "pcs" },
  { actual: 4180, key: "pt-3", line: "Packaging Line 1", planned: 5200, product: "Closure Assembly", unit: "pcs" },
  { actual: 2600, key: "pt-4", line: "Packaging Line 2", planned: 2600, product: "Label Roll", unit: "rolls" },
];

export const LINE_TARGETS: readonly LineTargetRecord[] = [
  { actual: 16550, key: "lt-1", line: "Injection Line 1", planned: 16800, shift: "Day" },
  { actual: 12200, key: "lt-2", line: "Injection Line 2", planned: 11500, shift: "Day" },
  { actual: 6780, key: "lt-3", line: "Packaging Line 1", planned: 7800, shift: "Night" },
];

export const WORKER_TARGETS: readonly WorkerTargetRecord[] = [
  { actual: 1180, key: "wt-1", line: "Injection Line 1", planned: 1200, role: "Operator", worker: "Worker 001" },
  { actual: 1320, key: "wt-2", line: "Injection Line 1", planned: 1200, role: "Operator", worker: "Worker 002" },
  { actual: 940, key: "wt-3", line: "Packaging Line 1", planned: 1100, role: "Packer", worker: "Worker 014" },
  { actual: 1060, key: "wt-4", line: "Packaging Line 1", planned: 1100, role: "Packer", worker: "Worker 015" },
];

export const PLAN_ACHIEVEMENT: readonly AchievementRecord[] = [
  { actual: 9120, context: "Injection Line 1", key: "pa-1", label: "Plan PL-2026-06-001", planned: 9600 },
  { actual: 7430, context: "Injection Line 2", key: "pa-2", label: "Plan PL-2026-06-002", planned: 7000 },
  { actual: 4180, context: "Packaging Line 1", key: "pa-3", label: "Plan PL-2026-06-003", planned: 5200 },
];

export const LINE_ACHIEVEMENT: readonly AchievementRecord[] = [
  { actual: 16550, context: "Day shift", key: "la-1", label: "Injection Line 1", planned: 16800 },
  { actual: 12200, context: "Day shift", key: "la-2", label: "Injection Line 2", planned: 11500 },
  { actual: 6780, context: "Night shift", key: "la-3", label: "Packaging Line 1", planned: 7800 },
];

export const WORKER_ACHIEVEMENT: readonly AchievementRecord[] = [
  { actual: 1320, context: "Injection Line 1", key: "wa-1", label: "Worker 002", planned: 1200 },
  { actual: 1180, context: "Injection Line 1", key: "wa-2", label: "Worker 001", planned: 1200 },
  { actual: 1060, context: "Packaging Line 1", key: "wa-3", label: "Worker 015", planned: 1100 },
  { actual: 940, context: "Packaging Line 1", key: "wa-4", label: "Worker 014", planned: 1100 },
];

export const MONTHLY_ACHIEVEMENT: readonly MonthlyAchievementRecord[] = [
  { actual: 318400, key: "ma-1", month: "January", planned: 320000 },
  { actual: 305900, key: "ma-2", month: "February", planned: 300000 },
  { actual: 331200, key: "ma-3", month: "March", planned: 325000 },
  { actual: 298750, key: "ma-4", month: "April", planned: 320000 },
  { actual: 340100, key: "ma-5", month: "May", planned: 330000 },
  { actual: 287600, key: "ma-6", month: "June", planned: 335000 },
];

export const SUPERVISOR_KPIS: readonly SupervisorKpiRecord[] = [
  { achievement: 96, dprCompletion: 100, key: "sk-1", lines: 2, scrapRate: 1.8, supervisor: "Supervisor A" },
  { achievement: 88, dprCompletion: 92, key: "sk-2", lines: 1, scrapRate: 3.4, supervisor: "Supervisor B" },
  { achievement: 79, dprCompletion: 86, key: "sk-3", lines: 2, scrapRate: 4.9, supervisor: "Supervisor C" },
];

export function achievementPercent(planned: number, actual: number): number {
  if (planned <= 0) {
    return 0;
  }
  return Math.round((actual / planned) * 100);
}

export function achievementTone(percent: number): AchievementTone {
  if (percent >= 100) {
    return "success";
  }
  if (percent >= 90) {
    return "warning";
  }
  if (percent > 0) {
    return "danger";
  }
  return "neutral";
}
