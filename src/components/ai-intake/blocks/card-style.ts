import { CircleAlert, CircleCheck, Info } from "lucide-react";

/** Tints for cards that are not a transaction. A transaction card uses its TypeTag instead. */
export const KIND_TINT = {
  knowledge: "bg-primary/10 text-primary",
  warning: "bg-warning/15",
  neutral: "bg-muted",
} as const;

export const TONE_ICON = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
} as const;

export const TONE_CLASS = {
  success: "text-success",
  error: "text-destructive",
  info: "text-muted-foreground",
} as const;
