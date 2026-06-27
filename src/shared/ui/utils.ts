export type Direction = "ltr" | "rtl";

export function cn(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(" ");
}

export function isRtl(direction: Direction): boolean {
  return direction === "rtl";
}
