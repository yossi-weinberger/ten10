// Shared utility functions for monitoring components

export const getTooltipDescriptions = (
  t: (key: string, defaultValue?: string) => string
) => ({
  // Service Health
  database: t("monitoring.tooltips.database"),
  auth: t("monitoring.tooltips.auth"),
  edgeFunctions: t("monitoring.tooltips.edgeFunctions"),
  email: t("monitoring.tooltips.email"),

  // Database Stats
  activeConnections: t("monitoring.tooltips.activeConnections"),
  slowQueries: t("monitoring.tooltips.slowQueries"),
  seqScans: t("monitoring.tooltips.seqScans"),
  indexScans: t("monitoring.tooltips.indexScans"),
  deadTuples: t("monitoring.tooltips.deadTuples"),
  rowCount: t("monitoring.tooltips.rowCount"),

  // Auth Stats
  failedLogins: t("monitoring.tooltips.failedLogins"),
  signups: t("monitoring.tooltips.signups"),
  passwordResets: t("monitoring.tooltips.passwordResets"),

  // Edge Functions
  invocations: t("monitoring.tooltips.invocations"),
  errors: t("monitoring.tooltips.errors"),
  errorRate: t("monitoring.tooltips.errorRate"),

  // Advisories
  securityAdvisory: t("monitoring.tooltips.securityAdvisory"),
  performanceAdvisory: t("monitoring.tooltips.performanceAdvisory"),

  // Email Stats
  emailSends: t("monitoring.tooltips.emailSends"),
  emailDeliveries: t("monitoring.tooltips.emailDeliveries"),
  emailBounces: t("monitoring.tooltips.emailBounces"),
  emailComplaints: t("monitoring.tooltips.emailComplaints"),
  emailDeliveryRate: t("monitoring.tooltips.emailDeliveryRate"),
  emailBounceRate: t("monitoring.tooltips.emailBounceRate"),

  // Cloudflare Stats
  cloudflare: t("monitoring.tooltips.cloudflare"),
  cfRequests: t("monitoring.tooltips.cfRequests"),
  cfErrors: t("monitoring.tooltips.cfErrors"),
  cfErrorRate: t("monitoring.tooltips.cfErrorRate"),

  // Vercel Stats
  vercel: t("monitoring.tooltips.vercel"),
  vercelDeployments: t("monitoring.tooltips.vercelDeployments"),
});
