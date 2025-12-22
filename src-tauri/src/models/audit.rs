// Security Audit Log Models
// Structured event logging for security-related operations
// Feature: Enhanced Project Security Posture - Phase 2

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Security event types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SecurityEventType {
    /// Authentication events (webhook token, signature)
    Authentication,
    /// Authorization events (tool permissions)
    Authorization,
    /// Data access events (project, workflow)
    DataAccess,
    /// Configuration changes
    Configuration,
    /// Tool execution events
    ToolExecution,
    /// Webhook trigger events
    WebhookTrigger,
    /// Security alerts (rate limit, suspicious activity)
    SecurityAlert,
}

impl std::fmt::Display for SecurityEventType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SecurityEventType::Authentication => write!(f, "authentication"),
            SecurityEventType::Authorization => write!(f, "authorization"),
            SecurityEventType::DataAccess => write!(f, "data_access"),
            SecurityEventType::Configuration => write!(f, "configuration"),
            SecurityEventType::ToolExecution => write!(f, "tool_execution"),
            SecurityEventType::WebhookTrigger => write!(f, "webhook_trigger"),
            SecurityEventType::SecurityAlert => write!(f, "security_alert"),
        }
    }
}

/// Actor types - who performed the action
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Actor {
    /// User action
    User,
    /// AI Assistant action
    #[serde(rename = "ai_assistant")]
    AIAssistant {
        #[serde(skip_serializing_if = "Option::is_none")]
        session_id: Option<String>,
    },
    /// Webhook action
    Webhook {
        #[serde(skip_serializing_if = "Option::is_none")]
        source_ip: Option<String>,
    },
    /// System action
    System,
}

impl std::fmt::Display for Actor {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Actor::User => write!(f, "user"),
            Actor::AIAssistant { .. } => write!(f, "ai_assistant"),
            Actor::Webhook { .. } => write!(f, "webhook"),
            Actor::System => write!(f, "system"),
        }
    }
}

/// Event outcome
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum Outcome {
    /// Action succeeded
    Success,
    /// Action failed
    Failure {
        #[serde(skip_serializing_if = "Option::is_none")]
        reason: Option<String>,
    },
    /// Action was denied
    Denied {
        #[serde(skip_serializing_if = "Option::is_none")]
        reason: Option<String>,
    },
}

impl std::fmt::Display for Outcome {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Outcome::Success => write!(f, "success"),
            Outcome::Failure { .. } => write!(f, "failure"),
            Outcome::Denied { .. } => write!(f, "denied"),
        }
    }
}

/// Security audit event
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditEvent {
    /// Unique event ID (UUID)
    pub id: String,
    /// Event timestamp
    pub timestamp: DateTime<Utc>,
    /// Event type
    pub event_type: SecurityEventType,
    /// Who performed the action
    pub actor: Actor,
    /// Action performed (e.g., "webhook_trigger", "tool_execute")
    pub action: String,
    /// Resource type (e.g., "workflow", "project", "api_key")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resource_type: Option<String>,
    /// Resource ID
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resource_id: Option<String>,
    /// Resource name (for display)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resource_name: Option<String>,
    /// Event outcome
    pub outcome: Outcome,
    /// Additional details (JSON)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
    /// Client IP address
    #[serde(skip_serializing_if = "Option::is_none")]
    pub client_ip: Option<String>,
}

impl AuditEvent {
    /// Create a new audit event with current timestamp
    pub fn new(
        event_type: SecurityEventType,
        actor: Actor,
        action: impl Into<String>,
        outcome: Outcome,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            event_type,
            actor,
            action: action.into(),
            resource_type: None,
            resource_id: None,
            resource_name: None,
            outcome,
            details: None,
            client_ip: None,
        }
    }

    /// Set resource information
    pub fn with_resource(
        mut self,
        resource_type: impl Into<String>,
        resource_id: impl Into<String>,
        resource_name: Option<String>,
    ) -> Self {
        self.resource_type = Some(resource_type.into());
        self.resource_id = Some(resource_id.into());
        self.resource_name = resource_name;
        self
    }

    /// Set additional details
    pub fn with_details(mut self, details: serde_json::Value) -> Self {
        self.details = Some(details);
        self
    }

    /// Set client IP
    pub fn with_client_ip(mut self, ip: impl Into<String>) -> Self {
        self.client_ip = Some(ip.into());
        self
    }
}

/// Audit event filter for queries
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditFilter {
    /// Start time (inclusive)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub from: Option<DateTime<Utc>>,
    /// End time (exclusive)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub to: Option<DateTime<Utc>>,
    /// Filter by event types
    #[serde(skip_serializing_if = "Option::is_none")]
    pub event_types: Option<Vec<SecurityEventType>>,
    /// Filter by actor type
    #[serde(skip_serializing_if = "Option::is_none")]
    pub actor_type: Option<String>,
    /// Filter by outcome
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outcome: Option<String>,
    /// Filter by resource type
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resource_type: Option<String>,
    /// Filter by resource ID
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resource_id: Option<String>,
    /// Maximum number of results
    #[serde(default = "default_limit")]
    pub limit: usize,
    /// Offset for pagination
    #[serde(default)]
    pub offset: usize,
}

fn default_limit() -> usize {
    100
}

/// Audit statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditStats {
    /// Total events in period
    pub total_events: u64,
    /// Events by type
    pub by_type: std::collections::HashMap<String, u64>,
    /// Events by outcome
    pub by_outcome: std::collections::HashMap<String, u64>,
    /// Events by actor type
    pub by_actor: std::collections::HashMap<String, u64>,
}

/// Database row for audit_log table
#[derive(Debug, Clone)]
pub struct AuditLogRow {
    pub id: String,
    pub timestamp: String,
    pub event_type: String,
    pub actor_type: String,
    pub actor_id: Option<String>,
    pub action: String,
    pub resource_type: Option<String>,
    pub resource_id: Option<String>,
    pub resource_name: Option<String>,
    pub outcome: String,
    pub outcome_reason: Option<String>,
    pub details: Option<String>,
    pub client_ip: Option<String>,
    pub created_at: String,
}

impl TryFrom<AuditLogRow> for AuditEvent {
    type Error = String;

    fn try_from(row: AuditLogRow) -> Result<Self, Self::Error> {
        let timestamp = DateTime::parse_from_rfc3339(&row.timestamp)
            .map_err(|e| format!("Invalid timestamp: {}", e))?
            .with_timezone(&Utc);

        let event_type = match row.event_type.as_str() {
            "authentication" => SecurityEventType::Authentication,
            "authorization" => SecurityEventType::Authorization,
            "data_access" => SecurityEventType::DataAccess,
            "configuration" => SecurityEventType::Configuration,
            "tool_execution" => SecurityEventType::ToolExecution,
            "webhook_trigger" => SecurityEventType::WebhookTrigger,
            "security_alert" => SecurityEventType::SecurityAlert,
            _ => return Err(format!("Unknown event type: {}", row.event_type)),
        };

        let actor = match row.actor_type.as_str() {
            "user" => Actor::User,
            "ai_assistant" => Actor::AIAssistant {
                session_id: row.actor_id,
            },
            "webhook" => Actor::Webhook {
                source_ip: row.client_ip.clone(),
            },
            "system" => Actor::System,
            _ => return Err(format!("Unknown actor type: {}", row.actor_type)),
        };

        let outcome = match row.outcome.as_str() {
            "success" => Outcome::Success,
            "failure" => Outcome::Failure {
                reason: row.outcome_reason,
            },
            "denied" => Outcome::Denied {
                reason: row.outcome_reason,
            },
            _ => return Err(format!("Unknown outcome: {}", row.outcome)),
        };

        let details = row
            .details
            .as_ref()
            .and_then(|s| serde_json::from_str(s).ok());

        Ok(AuditEvent {
            id: row.id,
            timestamp,
            event_type,
            actor,
            action: row.action,
            resource_type: row.resource_type,
            resource_id: row.resource_id,
            resource_name: row.resource_name,
            outcome,
            details,
            client_ip: row.client_ip,
        })
    }
}
