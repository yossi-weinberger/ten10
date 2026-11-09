/**
 * Closed intent labels for free text. The model chooses one of these.
 */

export const INTAKE_INTENTS = [
  "add_transaction",
  "create_rule",
  "create_recurring",
  "ask_data",
  "find_duplicates",
  "help",
  "inspiration",
  "domain_adjacent",
  "out_of_scope",
] as const;

export type IntakeIntent = (typeof INTAKE_INTENTS)[number];
