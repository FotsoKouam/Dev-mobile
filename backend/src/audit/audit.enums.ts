export enum AuditActionQuery {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  DOCUMENT_DOWNLOAD = 'document_download',
}

export enum AuditResult {
  SUCCESS = 'success',
  FAILURE = 'failure',
}

export enum AuditTarget {
  WEB_PORTAL = 'web_portal',
  MOBILE_APP = 'mobile_app',
}
