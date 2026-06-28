import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export type Direction = "ltr" | "rtl";

export function cn(...values: ClassValue[]): string {
  return twMerge(clsx(values));
}

export function isRtl(direction: Direction): boolean {
  return direction === "rtl";
}
