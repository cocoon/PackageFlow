/**
 * Audit Commands
 * Tauri commands for querying security audit logs
 */

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::services::audit::{AuditEvent, AuditFilter, AuditService, AuditStats};
use crate::DatabaseState;

/// Response for audit events query
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditLogResponse {
    pub events: Vec<AuditEventDto>,
    pub total: u64,
    pub has_more: bool,
}

/// DTO for audit event (frontend-friendly format)
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditEventDto {
    pub id: String,
    pub timestamp: String,
    pub event_type: String,
    pub actor: AuditActorDto,
    pub action: String,
    pub resource_type: Option<String>,
    pub resource_id: Option<String>,
    pub resource_name: Option<String>,
    pub outcome: String,
    pub outcome_reason: Option<String>,
    pub details: Option<serde_json::Value>,
    pub client_ip: Option<String>,
}

/// DTO for audit actor
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditActorDto {
    #[serde(rename = "type")]
    pub actor_type: String,
    pub session_id: Option<String>,
    pub source_ip: Option<String>,
}

/// DTO for audit stats
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditStatsDto {
    pub total_events: u64,
    pub by_type: std::collections::HashMap<String, u64>,
    pub by_outcome: std::collections::HashMap<String, u64>,
    pub by_actor: std::collections::HashMap<String, u64>,
}

/// Filter input from frontend
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditFilterInput {
    pub from: Option<String>,
    pub to: Option<String>,
    pub event_types: Option<Vec<String>>,
    pub actor_type: Option<String>,
    pub outcome: Option<String>,
    pub resource_type: Option<String>,
    pub resource_id: Option<String>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

impl From<AuditFilterInput> for AuditFilter {
    fn from(input: AuditFilterInput) -> Self {
        use chrono::DateTime;
        use crate::services::audit::SecurityEventType;

        let event_types = input.event_types.map(|types| {
            types
                .into_iter()
                .filter_map(|t| match t.as_str() {
                    "webhook_trigger" => Some(SecurityEventType::WebhookTrigger),
                    "authentication" => Some(SecurityEventType::Authentication),
                    "tool_execution" => Some(SecurityEventType::ToolExecution),
                    "security_alert" => Some(SecurityEventType::SecurityAlert),
                    "data_access" => Some(SecurityEventType::DataAccess),
                    "config_change" => Some(SecurityEventType::Configuration),
                    _ => None,
                })
                .collect()
        });

        AuditFilter {
            from: input.from.and_then(|s| DateTime::parse_from_rfc3339(&s).ok().map(|d| d.with_timezone(&chrono::Utc))),
            to: input.to.and_then(|s| DateTime::parse_from_rfc3339(&s).ok().map(|d| d.with_timezone(&chrono::Utc))),
            event_types,
            actor_type: input.actor_type,
            outcome: input.outcome,
            resource_type: input.resource_type,
            resource_id: input.resource_id,
            limit: input.limit.unwrap_or(50) as usize,
            offset: input.offset.unwrap_or(0) as usize,
        }
    }
}

impl From<AuditEvent> for AuditEventDto {
    fn from(event: AuditEvent) -> Self {
        use crate::services::audit::Actor;

        let (actor_type, session_id, source_ip) = match &event.actor {
            Actor::User => ("user".to_string(), None, None),
            Actor::AIAssistant { session_id } => {
                ("ai_assistant".to_string(), session_id.clone(), None)
            }
            Actor::Webhook { source_ip } => ("webhook".to_string(), None, source_ip.clone()),
            Actor::System => ("system".to_string(), None, None),
        };

        AuditEventDto {
            id: event.id,
            timestamp: event.timestamp.to_rfc3339(),
            event_type: event.event_type.to_string(),
            actor: AuditActorDto {
                actor_type,
                session_id,
                source_ip,
            },
            action: event.action,
            resource_type: event.resource_type,
            resource_id: event.resource_id,
            resource_name: event.resource_name,
            outcome: match &event.outcome {
                crate::services::audit::Outcome::Success => "success".to_string(),
                crate::services::audit::Outcome::Failure { .. } => "failure".to_string(),
                crate::services::audit::Outcome::Denied { .. } => "denied".to_string(),
            },
            outcome_reason: match &event.outcome {
                crate::services::audit::Outcome::Failure { reason } => reason.clone(),
                crate::services::audit::Outcome::Denied { reason } => reason.clone(),
                _ => None,
            },
            details: event.details,
            client_ip: event.client_ip,
        }
    }
}

impl From<AuditStats> for AuditStatsDto {
    fn from(stats: AuditStats) -> Self {
        AuditStatsDto {
            total_events: stats.total_events,
            by_type: stats.by_type,
            by_outcome: stats.by_outcome,
            by_actor: stats.by_actor,
        }
    }
}

/// Get audit events with filtering
#[tauri::command]
pub async fn get_audit_events(
    db: State<'_, DatabaseState>,
    filter: AuditFilterInput,
) -> Result<AuditLogResponse, String> {
    let service = AuditService::new(db.0.clone());
    let audit_filter: AuditFilter = filter.into();
    let limit = audit_filter.limit;

    let events = service.query(&audit_filter)?;
    let total = events.len() as u64; // TODO: Add count query for actual total
    let has_more = events.len() >= limit;

    let event_dtos: Vec<AuditEventDto> = events.into_iter().map(|e| e.into()).collect();

    Ok(AuditLogResponse {
        events: event_dtos,
        total,
        has_more,
    })
}

/// Get audit statistics for a time period
#[tauri::command]
pub async fn get_audit_stats(
    db: State<'_, DatabaseState>,
    days: Option<i64>,
) -> Result<AuditStatsDto, String> {
    let service = AuditService::new(db.0.clone());
    let stats = service.get_stats(days.unwrap_or(7))?;
    Ok(stats.into())
}

/// Export audit events (placeholder - can be expanded for CSV/JSON export)
#[tauri::command]
pub async fn export_audit_events(
    db: State<'_, DatabaseState>,
    filter: AuditFilterInput,
) -> Result<String, String> {
    let service = AuditService::new(db.0.clone());
    let audit_filter: AuditFilter = filter.into();
    let events = service.query(&audit_filter)?;

    // Convert to JSON for now
    let event_dtos: Vec<AuditEventDto> = events.into_iter().map(|e| e.into()).collect();
    serde_json::to_string_pretty(&event_dtos)
        .map_err(|e| format!("Failed to serialize events: {}", e))
}
