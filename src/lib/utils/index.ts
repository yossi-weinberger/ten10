import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export * from "./currency";
export * from "./export-excel";
export * from "./export-pdf";
export * from "./hebrew-date";
