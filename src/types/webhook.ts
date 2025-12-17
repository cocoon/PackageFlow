/**
 * Webhook types for workflow webhook support
 * @see specs/012-workflow-webhook-support/data-model.md
 */

/** Webhook configuration for a workflow */
export interface WebhookConfig {
  /** Whether the webhook is enabled */
  enabled: boolean;
  /** Webhook URL (must be HTTPS) */
  url: string;
  /** Trigger condition */
  trigger: WebhookTrigger;
  /** Custom HTTP headers */
  headers?: Record<string, string>;
  /** Custom payload template (JSON format) */
  payloadTemplate?: string;
}

/** Webhook trigger condition */
export type WebhookTrigger = 'onSuccess' | 'onFailure' | 'always';

/** Result of testing a webhook */
export interface WebhookTestResult {
  /** Whether the test was successful */
  success: boolean;
  /** HTTP response status code */
  statusCode?: number;
  /** Response body (truncated to 1000 chars) */
  responseBody?: string;
  /** Error message if failed */
  error?: string;
  /** Response time in milliseconds */
  responseTime: number;
}

/** Webhook delivery event for frontend notification */
export interface WebhookDeliveryEvent {
  /** Execution ID */
  executionId: string;
  /** Workflow ID */
  workflowId: string;
  /** Timestamp when delivery was attempted */
  attemptedAt: string;
  /** Whether delivery was successful */
  success: boolean;
  /** HTTP status code if received */
  statusCode?: number;
  /** Error message if failed */
  error?: string;
  /** Response time in milliseconds */
  responseTime?: number;
}

/** Default payload template */
export const DEFAULT_PAYLOAD_TEMPLATE = `{
  "workflow": {
    "id": "{{workflow_id}}",
    "name": "{{workflow_name}}"
  },
  "execution": {
    "id": "{{execution_id}}",
    "status": "{{status}}",
    "duration_ms": {{duration}},
    "timestamp": "{{timestamp}}"
  },
  "error": "{{error_message}}"
}`;

/** Supported template variables */
export const SUPPORTED_VARIABLES = [
  'workflow_id',
  'workflow_name',
  'execution_id',
  'status',
  'duration',
  'timestamp',
  'error_message',
] as const;

export type TemplateVariable = (typeof SUPPORTED_VARIABLES)[number];
