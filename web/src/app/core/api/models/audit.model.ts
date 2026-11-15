export type AuditAction = 'login_success' | 'login_failure' | 'logout';
export type AuditResult = 'success' | 'failure';
export type AuditTarget = 'web_portal' | 'mobile_app' | null;

export interface AuditLogUser {
  id: string;
  firstName: string;
  lastName: string;
  role?: string | null;
}

export interface AuditLogDetails {
  emailAttempted?: string | null;
  failureReason?: string | null;
  userAgent?: string | null;
}

export interface AuditLogItem {
  id: string;
  createdAt: string;
  action: AuditAction;
  result: AuditResult;
  target?: AuditTarget;
  user?: AuditLogUser | null;
  ipAddress?: string | null;
  details: AuditLogDetails;
}

export interface AuditStats {
  total: number;
  loginSuccess: number;
  loginFailure: number;
  logout: number;
}

export interface QueryAuditLogsParams {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  action?: AuditAction;
  result?: AuditResult;
  target?: string;
  userId?: string;
  search?: string;
}

export interface QueryAuditStatsParams {
  from?: string;
  to?: string;
}
