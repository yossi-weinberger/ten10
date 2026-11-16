/**
 * A forward-only user rule. The model names it. Nothing is saved here.
 */

export const RULE_ACTION_TYPES = [
  "exempt-income",
  "recognized-expense",
  "non_tithe_donation",
] as const;

export type RuleActionType = (typeof RULE_ACTION_TYPES)[number];

export interface ParsedUserRule {
  name: string;
  action: RuleActionType | "ambiguous";
}

export interface ActiveUserRule {
  name: string;
  type: RuleActionType;
}
