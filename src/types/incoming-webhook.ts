/**
 * Incoming Webhook Types
 * TypeScript interfaces for incoming webhook configuration
 * @see specs/012-workflow-webhook-support
 */

/** Incoming Webhook configuration (per workflow) */
export interface IncomingWebhookConfig {
  /** Whether incoming webhook is enabled */
  enabled: boolean;
  /** API Token for authentication (UUID v4) */
  token: string;
  /** Token creation timestamp (ISO 8601) */
  tokenCreatedAt: string;
}

/** Global incoming webhook server settings */
export interface IncomingWebhookServerSettings {
  /** Server listening port (default: 9876) */
  port: number;
}

/** Incoming webhook server status */
export interface IncomingWebhookServerStatus {
  /** Whether server is running */
  running: boolean;
  /** Current listening port */
  port: number;
  /** Number of active incoming webhooks */
  activeWebhooksCount: number;
}

/** Webhook trigger response */
export interface WebhookTriggerResponse {
  success: boolean;
  executionId?: string;
  message: string;
}

/** Default server port */
export const DEFAULT_INCOMING_WEBHOOK_PORT = 9876;

/** Generate webhook URL for a workflow */
export function generateWebhookUrl(
  port: number,
  workflowId: string,
  token: string
): string {
  return `http://localhost:${port}/webhook/${workflowId}?token=${token}`;
}
