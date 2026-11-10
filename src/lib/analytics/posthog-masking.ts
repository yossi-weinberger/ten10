/**
 * PostHog session-replay masking attributes for personal content.
 *
 * Apply these to elements that display personal user data: message text,
 * transaction fields, amounts, names, dates, clarification options that
 * echo user input, and any greeting or summary line that includes the
 * user's name, balance or amounts.
 *
 * Static UI chrome (headers, labels, buttons) stays unmasked.
 *
 * `ph-mask` + `ph-sensitive`: mask text, suppress autocapture $el_text.
 * `data-ph-mask`: belt-and-braces attribute selector for maskTextSelector.
 */
export const PH_SENSITIVE_PROPS = {
  className: "ph-mask ph-sensitive",
  "data-ph-mask": "",
} as const;
