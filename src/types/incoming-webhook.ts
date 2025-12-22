/**
 * Incoming Webhook Types
 * TypeScript interfaces for incoming webhook configuration
 * @see specs/012-workflow-webhook-support
 */

/** Default server port */
export const DEFAULT_INCOMING_WEBHOOK_PORT = 9876;

/** Incoming Webhook configuration (per workflow) */
export interface IncomingWebhookConfig {
  /** Whether incoming webhook is enabled */
  enabled: boolean;
  /** API Token for authentication (UUID v4) - legacy, kept for backward compatibility */
  token: string;
  /** Token creation timestamp (ISO 8601) */
  tokenCreatedAt: string;
  /** Server listening port (per-workflow, default: 9876) */
  port: number;
  /** HMAC secret for signature verification (new security feature) */
  secret?: string;
  /** Whether to require HMAC signature (default: false for backward compatibility) */
  requireSignature: boolean;
  /** Rate limit: max requests per minute (default: 60) */
  rateLimitPerMinute: number;
}

/** Information about a running webhook server */
export interface RunningServerInfo {
  /** Workflow ID this server serves */
  workflowId: string;
  /** Workflow name for display */
  workflowName: string;
  /** Port the server is listening on */
  port: number;
  /** Whether the server is running */
  running: boolean;
}

/** Incoming webhook server status (multi-server) */
export interface IncomingWebhookServerStatus {
  /** List of all running servers */
  runningServers: RunningServerInfo[];
  /** Total number of running servers */
  runningCount: number;
}

/** Webhook trigger response */
export interface WebhookTriggerResponse {
  success: boolean;
  executionId?: string;
  message: string;
}

/** Generate webhook URL for a workflow (simplified - no workflowId in path) */
export function generateWebhookUrl(port: number, token: string): string {
  return `http://localhost:${port}/webhook?token=${token}`;
}

/** Generate webhook URL without token (for signature-based auth) */
export function generateWebhookUrlWithSignature(port: number): string {
  return `http://localhost:${port}/webhook`;
}

/** Generate curl example for webhook with signature */
export function generateCurlWithSignature(
  port: number,
  secret: string,
  payload: string = '{}'
): string {
  return `# Generate signature and call webhook
PAYLOAD='${payload}'
SECRET='${secret}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print "sha256="$2}')
curl -X POST http://localhost:${port}/webhook \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Signature: $SIGNATURE" \\
  -d "$PAYLOAD"`;
}
