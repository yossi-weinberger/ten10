import { supabase } from "@/lib/supabaseClient";
import { logger } from "@/lib/logger";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface SlowQuery {
  query: string;
  calls: number;
  totalTime: number;
  meanTime: number;
}

export interface TableStat {
  tableName: string;
  rowCount: number;
  seqScans: number;
  indexScans: number;
  deadTuples: number;
}

export interface Advisory {
  type: "security" | "performance";
  message: string;
  severity: "warning" | "error";
  table?: string;
}

export interface DatabaseStats {
  activeConnections: number;
  slowQueries: SlowQuery[];
  tableStats: TableStat[];
  advisories: Advisory[];
}

export interface AuthEvent {
  id: string;
  action: string;
  createdAt: string;
  ipAddress?: string;
}

export interface AuthStats {
  recentEvents: AuthEvent[];
  failedLogins24h: number;
  signups24h: number;
  passwordResets24h: number;
}

export interface EdgeFunctionStats {
  invocations24h: number;
  errors24h: number;
  errorRate: number;
}

export interface EmailStats {
  sends24h: number;
  deliveries24h: number;
  bounces24h: number;
  complaints24h: number;
  rejects24h: number;
  deliveryRate: number;
  bounceRate: number;
  available: boolean;
  error?: string;
}

export interface CloudflareStats {
  requests24h: number;
  errors24h: number;
  errorRate: number;
  bandwidth24h: number;
  available: boolean;
  error?: string;
}

export interface VercelDeployment {
  id: string;
  state: string;
  createdAt: string;
  url?: string;
  meta?: {
    githubCommitMessage?: string;
    githubCommitRef?: string;
  };
}

export interface VercelStats {
  deployments: VercelDeployment[];
  lastDeployment?: VercelDeployment;
  available: boolean;
  error?: string;
}

export type AnomalyType = "auth" | "database" | "edge_function" | "email";
export type AnomalySeverity = "warning" | "error";

export interface Anomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  message: string;
  value?: number;
  threshold?: number;
}

export interface MonitoringData {
  database: DatabaseStats;
  auth: AuthStats;
  edgeFunctions: EdgeFunctionStats;
  email: EmailStats;
  cloudflare?: CloudflareStats;
  vercel?: VercelStats;
  anomalies: Anomaly[];
  timestamp: string;
}

export type ServiceHealthStatus = "healthy" | "warning" | "error" | "unknown";

export interface ServiceHealth {
  name: string;
  status: ServiceHealthStatus;
  message?: string;
  lastCheck: string;
}

export interface SystemHealthOverview {
  database: ServiceHealth;
  auth: ServiceHealth;
  edgeFunctions: ServiceHealth;
  email: ServiceHealth;
  overallStatus: ServiceHealthStatus;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Fetch monitoring data from the Edge Function
 * Requires admin privileges
 */
export async function fetchMonitoringData(): Promise<MonitoringData | null> {
  try {
    logger.log("MonitoringService: Fetching monitoring data");

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      logger.error("MonitoringService: No access token available");
      return null;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(
      `${supabaseUrl}/functions/v1/get-monitoring-data`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error(
        "MonitoringService: Error response",
        response.status,
        errorData
      );
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    logger.log("MonitoringService: Data fetched successfully");
    return data as MonitoringData;
  } catch (error) {
    logger.error("MonitoringService: Failed to fetch monitoring data:", error);
    return null;
  }
}

/**
 * Calculate system health overview from monitoring data
 */
export function calculateSystemHealth(
  data: MonitoringData
): SystemHealthOverview {
  const now = new Date().toISOString();

  // Database health
  const dbAnomalies = data.anomalies.filter((a) => a.type === "database");
  const dbHasError = dbAnomalies.some((a) => a.severity === "error");
  const dbHasWarning = dbAnomalies.some((a) => a.severity === "warning");

  const databaseHealth: ServiceHealth = {
    name: "Database",
    status: dbHasError ? "error" : dbHasWarning ? "warning" : "healthy",
    message:
      dbAnomalies.length > 0
        ? `${dbAnomalies.length} issue(s) detected`
        : "All systems normal",
    lastCheck: now,
  };

  // Auth health
  const authAnomalies = data.anomalies.filter((a) => a.type === "auth");
  const authHasError = authAnomalies.some((a) => a.severity === "error");
  const authHasWarning = authAnomalies.some((a) => a.severity === "warning");

  const authHealth: ServiceHealth = {
    name: "Authentication",
    status: authHasError ? "error" : authHasWarning ? "warning" : "healthy",
    message:
      data.auth.failedLogins24h > 0
        ? `${data.auth.failedLogins24h} failed login(s) in 24h`
        : "All systems normal",
    lastCheck: now,
  };

  // Edge Functions health
  const edgeAnomalies = data.anomalies.filter(
    (a) => a.type === "edge_function"
  );
  const edgeHasError = edgeAnomalies.some((a) => a.severity === "error");
  const edgeHasWarning = edgeAnomalies.some((a) => a.severity === "warning");

  const edgeFunctionsHealth: ServiceHealth = {
    name: "Edge Functions",
    status: edgeHasError ? "error" : edgeHasWarning ? "warning" : "healthy",
    message:
      data.edgeFunctions.errorRate > 0
        ? `${data.edgeFunctions.errorRate}% error rate`
        : "All systems normal",
    lastCheck: now,
  };

  // Email health (using SES data)
  const emailAnomalies = data.anomalies.filter((a) => a.type === "email");
  const emailHasError = emailAnomalies.some((a) => a.severity === "error");
  const emailHasWarning = emailAnomalies.some((a) => a.severity === "warning");

  let emailMessage = "All systems normal";
  let emailStatus: ServiceHealthStatus = "healthy";

  if (!data.email) {
    emailStatus = "unknown";
    emailMessage = "Requires deployment";
  } else if (!data.email.available) {
    emailStatus = "unknown";
    emailMessage = data.email.error || "Not configured";
  } else if (emailHasError) {
    emailStatus = "error";
    emailMessage = `Bounce rate: ${data.email.bounceRate}%`;
  } else if (emailHasWarning) {
    emailStatus = "warning";
    emailMessage = `${data.email.sends24h} sent, ${data.email.bounces24h} bounced`;
  } else if (data.email.sends24h > 0) {
    emailMessage = `${data.email.sends24h} sent, ${data.email.deliveryRate}% delivered`;
  }

  const emailHealth: ServiceHealth = {
    name: "Email",
    status: emailStatus,
    message: emailMessage,
    lastCheck: now,
  };

  // Calculate overall status
  const allStatuses = [
    databaseHealth.status,
    authHealth.status,
    edgeFunctionsHealth.status,
    emailHealth.status,
  ];

  let overallStatus: ServiceHealthStatus = "healthy";
  if (allStatuses.includes("error")) {
    overallStatus = "error";
  } else if (allStatuses.includes("warning")) {
    overallStatus = "warning";
  } else if (allStatuses.includes("unknown")) {
    overallStatus = "unknown";
  }

  return {
    database: databaseHealth,
    auth: authHealth,
    edgeFunctions: edgeFunctionsHealth,
    email: emailHealth,
    overallStatus,
  };
}

/**
 * Get recent errors from monitoring data
 */
export function getRecentErrors(data: MonitoringData): Anomaly[] {
  return data.anomalies.filter((a) => a.severity === "error").slice(0, 10);
}

/**
 * Get warnings from monitoring data
 */
export function getWarnings(data: MonitoringData): Anomaly[] {
  return data.anomalies.filter((a) => a.severity === "warning").slice(0, 10);
}

/**
 * Get security advisories from database stats
 */
export function getSecurityAdvisories(data: MonitoringData): Advisory[] {
  return data.database.advisories.filter((a) => a.type === "security");
}

/**
 * Get performance advisories from database stats
 */
export function getPerformanceAdvisories(data: MonitoringData): Advisory[] {
  return data.database.advisories.filter((a) => a.type === "performance");
}

/**
 * Format a timestamp for display
 * @param timestamp - ISO timestamp string
 * @param locale - Optional locale (defaults to browser locale)
 */
export function formatTimestamp(timestamp: string, locale?: string): string {
  try {
    const date = new Date(timestamp);
    const localeToUse = locale || navigator.language || "he-IL";
    return date.toLocaleString(localeToUse, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return timestamp;
  }
}

/**
 * Format milliseconds to a readable duration
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }
}
