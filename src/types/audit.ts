/**
 * Security Audit Log Types
 * Types for the security audit log system
 */

/** Event types that can be audited */
export type AuditEventType =
  | 'webhook_trigger'
  | 'authentication'
  | 'tool_execution'
  | 'security_alert'
  | 'data_access'
  | 'config_change';

/** Actor types that can generate events */
export type AuditActorType = 'user' | 'ai_assistant' | 'webhook' | 'system';

/** Outcome of an audited action */
export type AuditOutcome = 'success' | 'failure' | 'denied';

/** Actor information for an audit event */
export interface AuditActor {
  type: AuditActorType;
  sessionId?: string;
  sourceIp?: string;
}

/** A single audit event entry */
export interface AuditEvent {
  id: string;
  timestamp: string; // ISO 8601
  eventType: AuditEventType;
  actor: AuditActor;
  action: string;
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  outcome: AuditOutcome;
  outcomeReason?: string;
  details?: Record<string, unknown>;
  clientIp?: string;
}

/** Aggregated statistics for audit events */
export interface AuditStats {
  totalEvents: number;
  byType: Record<string, number>;
  byOutcome: Record<string, number>;
  byActor: Record<string, number>;
}

/** Filter parameters for querying audit events */
export interface AuditFilter {
  from?: string;
  to?: string;
  eventTypes?: AuditEventType[];
  actorType?: AuditActorType;
  outcome?: AuditOutcome;
  resourceType?: string;
  resourceId?: string;
  limit: number;
  offset: number;
}

/** Response from the audit log API */
export interface AuditLogResponse {
  events: AuditEvent[];
  total: number;
  hasMore: boolean;
}

/** Time range presets for filtering */
export type AuditTimeRange = 'last_24h' | 'last_7d' | 'last_30d' | 'custom';
