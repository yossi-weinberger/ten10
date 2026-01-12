// ============================================================================
// TypeScript Interfaces for Monitoring Service
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
