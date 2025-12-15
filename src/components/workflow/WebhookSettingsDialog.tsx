/**
 * Webhook Settings Dialog
 * Dialog for configuring webhook notifications for a workflow
 * Per-workflow server architecture: each workflow has its own HTTP server
 * @see specs/012-workflow-webhook-support
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  Webhook,
  Bell,
  Link,
  AlertCircle,
  CheckCircle,
  Play,
  Plus,
  Trash2,
  FileCode,
  Loader2,
  Copy,
  RefreshCw,
  ArrowDownToLine,
  ArrowUpFromLine,
} from 'lucide-react';
import type { WebhookConfig, WebhookTrigger, WebhookTestResult } from '../../types/webhook';
import type { IncomingWebhookConfig, IncomingWebhookServerStatus } from '../../types/incoming-webhook';
import { DEFAULT_PAYLOAD_TEMPLATE, SUPPORTED_VARIABLES } from '../../types/webhook';
import { generateWebhookUrl, DEFAULT_INCOMING_WEBHOOK_PORT } from '../../types/incoming-webhook';
import { webhookAPI, incomingWebhookAPI, type PortStatus } from '../../lib/tauri-api';

// Payload format presets
type PayloadFormat = 'discord' | 'slack' | 'telegram' | 'custom';
type TabType = 'outgoing' | 'incoming';

const DISCORD_TEMPLATE = `{
  "content": "{{status}} **{{workflow_name}}** completed in {{duration}}ms"
}`;

const SLACK_TEMPLATE = `{
  "text": "{{status}} *{{workflow_name}}* completed in {{duration}}ms"
}`;

const TELEGRAM_TEMPLATE = `{
  "chat_id": "YOUR_CHAT_ID",
  "text": "{{status}} *{{workflow_name}}* completed in {{duration}}ms",
  "parse_mode": "Markdown"
}`;

interface WebhookSettingsDialogProps {
  isOpen: boolean;
  workflowId: string;
  config: WebhookConfig | undefined;
  incomingConfig: IncomingWebhookConfig | undefined;
  onClose: () => void;
  onSave: (config: WebhookConfig | undefined, incomingConfig: IncomingWebhookConfig | undefined) => void;
}

/**
 * Webhook Settings Dialog Component
 */
export function WebhookSettingsDialog({
  isOpen,
  workflowId,
  config,
  incomingConfig,
  onClose,
  onSave,
}: WebhookSettingsDialogProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('outgoing');

  // ========================
  // Outgoing Webhook State
  // ========================
  const [enabled, setEnabled] = useState(false);
  const [url, setUrl] = useState('');
  const [trigger, setTrigger] = useState<WebhookTrigger>('always');
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>([]);
  const [payloadTemplate, setPayloadTemplate] = useState('');
  const [payloadFormat, setPayloadFormat] = useState<PayloadFormat>('custom');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Outgoing validation state
  const [urlError, setUrlError] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Outgoing test state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<WebhookTestResult | null>(null);

  // ========================
  // Incoming Webhook State
  // ========================
  const [incomingEnabled, setIncomingEnabled] = useState(false);
  const [incomingToken, setIncomingToken] = useState('');
  const [incomingTokenCreatedAt, setIncomingTokenCreatedAt] = useState('');
  const [incomingPort, setIncomingPort] = useState(DEFAULT_INCOMING_WEBHOOK_PORT);
  const [serverStatus, setServerStatus] = useState<IncomingWebhookServerStatus | null>(null);
  const [isLoadingServerStatus, setIsLoadingServerStatus] = useState(false);
  const [isRegeneratingToken, setIsRegeneratingToken] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [portStatus, setPortStatus] = useState<PortStatus | null>(null);
  const [isCheckingPort, setIsCheckingPort] = useState(false);

  // Detect payload format from template
  const detectFormat = (template: string): PayloadFormat => {
    const normalized = template.replace(/\s/g, '');
    if (normalized.includes('"content":')) return 'discord';
    if (normalized.includes('"chat_id":') && normalized.includes('"parse_mode":')) return 'telegram';
    if (normalized.includes('"text":')) return 'slack';
    return 'custom';
  };

  // Load incoming webhook server status
  const loadServerStatus = async () => {
    setIsLoadingServerStatus(true);
    try {
      const status = await incomingWebhookAPI.getServerStatus();
      setServerStatus(status);
    } catch (error) {
      console.error('Failed to load incoming webhook status:', error);
    } finally {
      setIsLoadingServerStatus(false);
    }
  };

  // Check port availability (with current workflow excluded)
  const checkPortAvailability = async (port: number) => {
    setIsCheckingPort(true);
    try {
      const status = await incomingWebhookAPI.checkPortAvailable(port, workflowId);
      setPortStatus(status);
    } catch (error) {
      console.error('Failed to check port availability:', error);
      setPortStatus(null);
    } finally {
      setIsCheckingPort(false);
    }
  };

  // Helper to extract workflow name from port status
  const getPortStatusWorkflowName = (status: PortStatus): string | null => {
    if (typeof status === 'object' && 'InUseByWorkflow' in status) {
      return status.InUseByWorkflow;
    }
    return null;
  };

  // Helper to check if port is available
  const isPortAvailable = (status: PortStatus | null): boolean => {
    return status === 'Available';
  };

  // Helper to check if port is used by other workflow
  const isPortUsedByOtherWorkflow = (status: PortStatus | null): boolean => {
    if (status === null) return false;
    return typeof status === 'object' && 'InUseByWorkflow' in status;
  };

  // Helper to check if port is used by external service
  const isPortUsedByOther = (status: PortStatus | null): boolean => {
    return status === 'InUseByOther';
  };

  // Check port when it changes
  useEffect(() => {
    if (isOpen && incomingPort >= 1024 && incomingPort <= 65535) {
      const timer = setTimeout(() => {
        checkPortAvailability(incomingPort);
      }, 300); // Debounce
      return () => clearTimeout(timer);
    }
  }, [isOpen, incomingPort, workflowId]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Reset outgoing webhook state
      if (config) {
        setEnabled(config.enabled);
        setUrl(config.url);
        setTrigger(config.trigger);
        setHeaders(
          config.headers
            ? Object.entries(config.headers).map(([key, value]) => ({ key, value }))
            : []
        );
        const template = config.payloadTemplate || '';
        setPayloadTemplate(template);
        setPayloadFormat(template ? detectFormat(template) : 'custom');
        setShowAdvanced(!!(config.headers && Object.keys(config.headers).length > 0) || !!config.payloadTemplate);
      } else {
        setEnabled(false);
        setUrl('');
        setTrigger('always');
        setHeaders([]);
        setPayloadTemplate('');
        setPayloadFormat('custom');
        setShowAdvanced(false);
      }

      // Reset incoming webhook state from incomingConfig (includes port)
      if (incomingConfig) {
        setIncomingEnabled(incomingConfig.enabled);
        setIncomingToken(incomingConfig.token);
        setIncomingTokenCreatedAt(incomingConfig.tokenCreatedAt);
        setIncomingPort(incomingConfig.port || DEFAULT_INCOMING_WEBHOOK_PORT);
      } else {
        setIncomingEnabled(false);
        setIncomingToken('');
        setIncomingTokenCreatedAt('');
        setIncomingPort(DEFAULT_INCOMING_WEBHOOK_PORT);
      }

      setUrlError(null);
      setJsonError(null);
      setTestResult(null);
      setCopySuccess(false);
      setPortStatus(null);

      // Load server status
      loadServerStatus();
    }
  }, [isOpen, config, incomingConfig]);

  // URL validation
  const validateUrl = (value: string): boolean => {
    if (!value.trim()) {
      setUrlError('URL is required');
      return false;
    }

    try {
      const parsed = new URL(value);
      if (parsed.protocol !== 'https:') {
        setUrlError('Only HTTPS URLs are supported');
        return false;
      }
      setUrlError(null);
      return true;
    } catch {
      setUrlError('Invalid URL format');
      return false;
    }
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (value) {
      validateUrl(value);
    } else {
      setUrlError(null);
    }
  };

  // JSON validation
  const validateJson = (value: string): boolean => {
    if (!value.trim()) {
      setJsonError(null);
      return true;
    }

    try {
      JSON.parse(value);
      setJsonError(null);
      return true;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Invalid JSON';
      setJsonError(errorMsg);
      return false;
    }
  };

  // Handle payload format change
  const handleFormatChange = (format: PayloadFormat) => {
    setPayloadFormat(format);
    if (format === 'discord') {
      setPayloadTemplate(DISCORD_TEMPLATE);
      setJsonError(null);
    } else if (format === 'slack') {
      setPayloadTemplate(SLACK_TEMPLATE);
      setJsonError(null);
    } else if (format === 'telegram') {
      setPayloadTemplate(TELEGRAM_TEMPLATE);
      setJsonError(null);
    }
  };

  // Handle payload template change
  const handlePayloadChange = (value: string) => {
    setPayloadTemplate(value);
    setPayloadFormat('custom');
    validateJson(value);
  };

  // Header management
  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
    setShowAdvanced(true);
  };

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...headers];
    newHeaders[index][field] = value;
    setHeaders(newHeaders);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  // Test webhook
  const handleTest = async () => {
    if (!validateUrl(url)) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const headersObj = headers
        .filter((h) => h.key.trim())
        .reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {} as Record<string, string>);

      const result = await webhookAPI.testWebhook(
        url,
        Object.keys(headersObj).length > 0 ? headersObj : undefined,
        payloadTemplate || undefined
      );

      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Test failed',
        responseTime: 0,
      });
    } finally {
      setIsTesting(false);
    }
  };

  // ========================
  // Incoming Webhook Handlers
  // ========================

  // Initialize incoming webhook config (with default port)
  const handleInitIncomingConfig = async () => {
    try {
      const newConfig = await incomingWebhookAPI.createConfig();
      setIncomingToken(newConfig.token);
      setIncomingTokenCreatedAt(newConfig.tokenCreatedAt);
      setIncomingPort(newConfig.port);
      setIncomingEnabled(true);
    } catch (error) {
      console.error('Failed to create incoming webhook config:', error);
    }
  };

  // Regenerate token
  const handleRegenerateToken = async () => {
    if (!incomingToken) return;

    setIsRegeneratingToken(true);
    try {
      const updatedConfig = await incomingWebhookAPI.regenerateToken({
        enabled: incomingEnabled,
        token: incomingToken,
        tokenCreatedAt: incomingTokenCreatedAt,
        port: incomingPort,
      });
      setIncomingToken(updatedConfig.token);
      setIncomingTokenCreatedAt(updatedConfig.tokenCreatedAt);
    } catch (error) {
      console.error('Failed to regenerate token:', error);
    } finally {
      setIsRegeneratingToken(false);
    }
  };

  // Copy webhook URL (using simplified URL format)
  const handleCopyUrl = async () => {
    const webhookUrl = generateWebhookUrl(incomingPort, incomingToken);
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  // Toggle incoming webhook enabled (only updates local state, saved on Save button)
  const handleToggleIncoming = (newEnabled: boolean) => {
    setIncomingEnabled(newEnabled);
  };

  // Get this workflow's server status
  const getWorkflowServerStatus = () => {
    if (!serverStatus) return null;
    return serverStatus.runningServers.find(s => s.workflowId === workflowId);
  };

  // Save configuration
  const handleSave = async () => {
    if (enabled && !validateUrl(url)) return;
    if (enabled && payloadTemplate.trim() && !validateJson(payloadTemplate)) return;

    // Build outgoing config - save even when disabled if there's any configuration
    let outgoingConfig: WebhookConfig | undefined;
    const hasOutgoingConfig = url.trim() || headers.length > 0 || payloadTemplate.trim();
    if (enabled || hasOutgoingConfig) {
      const headersObj = headers
        .filter((h) => h.key.trim())
        .reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {} as Record<string, string>);

      outgoingConfig = {
        enabled,
        url,
        trigger,
        headers: Object.keys(headersObj).length > 0 ? headersObj : undefined,
        payloadTemplate: payloadTemplate.trim() || undefined,
      };
    }

    // Build incoming config (now includes port)
    console.log('[WebhookSettingsDialog] handleSave - building incoming config');
    console.log('[WebhookSettingsDialog] incomingToken:', incomingToken);
    console.log('[WebhookSettingsDialog] incomingEnabled:', incomingEnabled);
    console.log('[WebhookSettingsDialog] incomingPort:', incomingPort);
    let newIncomingConfig: IncomingWebhookConfig | undefined;
    if (incomingToken) {
      newIncomingConfig = {
        enabled: incomingEnabled,
        token: incomingToken,
        tokenCreatedAt: incomingTokenCreatedAt,
        port: incomingPort,
      };
      console.log('[WebhookSettingsDialog] newIncomingConfig created:', newIncomingConfig);
    } else {
      console.log('[WebhookSettingsDialog] incomingToken is falsy, newIncomingConfig will be undefined');
    }

    // Save workflow (this triggers server sync which will start/stop/restart servers as needed)
    onSave(outgoingConfig, newIncomingConfig);
    onClose();
  };

  // ========================
  // Render
  // ========================

  const workflowServerStatus = getWorkflowServerStatus();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
              <Webhook className="w-4 h-4 text-white" />
            </div>
            Webhook Settings
          </DialogTitle>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b border-border mt-2">
          <button
            type="button"
            className={`flex-1 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'outgoing'
                ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-500'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('outgoing')}
          >
            <ArrowUpFromLine className="w-4 h-4" />
            Outgoing
          </button>
          <button
            type="button"
            className={`flex-1 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'incoming'
                ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-500'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('incoming')}
          >
            <ArrowDownToLine className="w-4 h-4" />
            Incoming
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto min-h-0 px-1 -mx-1">
          {activeTab === 'outgoing' ? (
            // ========================
            // Outgoing Webhook Tab
            // ========================
            <>
              {/* Usage hint - only show when disabled */}
              {!enabled && (
                <div className="bg-purple-500/10 dark:bg-purple-900/20 border border-purple-500/30 dark:border-purple-800/30 rounded-lg p-3 text-xs mt-2">
                  <p className="font-medium mb-1 text-purple-700 dark:text-purple-300">Outgoing Webhook</p>
                  <p className="text-purple-600 dark:text-purple-400">
                    Send a notification when this workflow completes. Use cases:
                  </p>
                  <ul className="mt-1 ml-4 list-disc text-purple-600/80 dark:text-purple-400/80">
                    <li>Notify Slack or Discord channel</li>
                    <li>Trigger downstream CI/CD pipelines</li>
                    <li>Log results to monitoring systems</li>
                  </ul>
                </div>
              )}

              <div className="space-y-4 mt-4">
                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">Enable Webhook</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      enabled ? 'bg-purple-600' : 'bg-muted'
                    }`}
                    onClick={() => setEnabled(!enabled)}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* URL Input */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Link className="w-4 h-4" />
                    Webhook URL
                  </label>
                  <Input
                    value={url}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://example.com/webhook"
                    disabled={!enabled}
                    className={`bg-background border-border text-foreground ${
                      urlError ? 'border-red-500' : ''
                    }`}
                  />
                  {urlError && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {urlError}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Only HTTPS URLs are supported for security.</p>
                </div>

                {/* Trigger Condition */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Trigger Condition</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'always', label: 'Always' },
                      { value: 'onSuccess', label: 'On Success' },
                      { value: 'onFailure', label: 'On Failure' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        disabled={!enabled}
                        className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                          trigger === option.value
                            ? 'bg-purple-500/20 border-purple-500 text-purple-700 dark:text-purple-300'
                            : 'bg-background border-border text-muted-foreground hover:border-muted'
                        } ${!enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => setTrigger(option.value as WebhookTrigger)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Advanced Settings Toggle */}
                <button
                  type="button"
                  className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? '▼' : '▶'} Advanced Settings
                </button>

                {showAdvanced && (
                  <>
                    {/* Custom Headers */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Custom Headers</label>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!enabled}
                          onClick={addHeader}
                          className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Header
                        </Button>
                      </div>
                      {headers.map((header, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={header.key}
                            onChange={(e) => updateHeader(index, 'key', e.target.value)}
                            placeholder="Header name"
                            disabled={!enabled}
                            className="bg-background border-border text-foreground text-sm flex-1"
                          />
                          <Input
                            value={header.value}
                            onChange={(e) => updateHeader(index, 'value', e.target.value)}
                            placeholder="Value"
                            disabled={!enabled}
                            className="bg-background border-border text-foreground text-sm flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!enabled}
                            onClick={() => removeHeader(index)}
                            className="text-red-400 hover:text-red-300 px-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      {headers.length === 0 && (
                        <p className="text-xs text-muted-foreground">No custom headers configured.</p>
                      )}
                    </div>

                    {/* Payload Template */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <FileCode className="w-4 h-4" />
                        Payload Template (JSON)
                      </label>

                      {/* Format Presets */}
                      <div className="flex gap-2">
                        {[
                          { value: 'custom', label: 'Custom' },
                          { value: 'discord', label: 'Discord' },
                          { value: 'slack', label: 'Slack' },
                          { value: 'telegram', label: 'Telegram' },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            disabled={!enabled}
                            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                              payloadFormat === option.value
                                ? 'bg-purple-500/20 border-purple-500 text-purple-700 dark:text-purple-300'
                                : 'bg-background border-border text-muted-foreground hover:border-muted'
                            } ${!enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={() => handleFormatChange(option.value as PayloadFormat)}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>

                      <textarea
                        value={payloadTemplate}
                        onChange={(e) => handlePayloadChange(e.target.value)}
                        placeholder={DEFAULT_PAYLOAD_TEMPLATE}
                        disabled={!enabled}
                        rows={6}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        className={`w-full bg-background border rounded-lg p-3 text-foreground font-mono text-xs resize-none focus:outline-none ${
                          jsonError
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-border focus:border-purple-500'
                        }`}
                      />
                      {jsonError && (
                        <p className="text-xs text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Invalid JSON: {jsonError}
                        </p>
                      )}
                      <div className="text-xs text-muted-foreground">
                        <p className="mb-1">Available variables:</p>
                        <div className="flex flex-wrap gap-1">
                          {SUPPORTED_VARIABLES.map((v) => (
                            <code
                              key={v}
                              className="px-1.5 py-0.5 bg-muted rounded text-foreground"
                            >
                              {`{{${v}}}`}
                            </code>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Test Result */}
                {testResult && (
                  <div
                    className={`p-3 rounded-lg border ${
                      testResult.success
                        ? 'bg-green-900/20 border-green-700'
                        : 'bg-red-900/20 border-red-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {testResult.success ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span
                        className={`text-sm font-medium ${
                          testResult.success ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {testResult.success ? 'Test Successful' : 'Test Failed'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {testResult.statusCode && <p>Status: {testResult.statusCode}</p>}
                      <p>Response time: {testResult.responseTime}ms</p>
                      {testResult.error && (
                        <p className="text-red-400">Error: {testResult.error}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            // ========================
            // Incoming Webhook Tab
            // ========================
            <div className="space-y-4 mt-4">
              {/* Usage hint */}
              {!incomingEnabled && !incomingToken && (
                <div className="bg-purple-500/10 dark:bg-purple-900/20 border border-purple-500/30 dark:border-purple-800/30 rounded-lg p-3 text-xs">
                  <p className="font-medium mb-1 text-purple-700 dark:text-purple-300">Incoming Webhook</p>
                  <p className="text-purple-600 dark:text-purple-400">
                    Allow external systems to trigger this workflow via HTTP request. Use cases:
                  </p>
                  <ul className="mt-1 ml-4 list-disc text-purple-600/80 dark:text-purple-400/80">
                    <li>Trigger from CI/CD pipeline</li>
                    <li>Integrate with external automation tools</li>
                    <li>Start workflow via cron job or scheduler</li>
                  </ul>
                </div>
              )}

              {/* Server Status for this workflow */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-foreground">Server Status</span>
                  {isLoadingServerStatus ? (
                    <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                  ) : workflowServerStatus?.running ? (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                      Running on port {workflowServerStatus.port}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="w-2 h-2 bg-muted rounded-full"></span>
                      {incomingEnabled ? 'Will start on save' : 'Not running'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Each workflow has its own dedicated server on the configured port.
                </p>
              </div>

              {/* Port Configuration */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Server Port</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={incomingPort}
                    onChange={(e) => setIncomingPort(parseInt(e.target.value) || DEFAULT_INCOMING_WEBHOOK_PORT)}
                    min={1024}
                    max={65535}
                    className={`bg-background border-border text-foreground flex-1 ${
                      isPortUsedByOther(portStatus) ? 'border-red-500' : ''
                    }`}
                  />
                  {isCheckingPort && (
                    <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                  )}
                  {!isCheckingPort && isPortAvailable(portStatus) && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {!isCheckingPort && isPortUsedByOtherWorkflow(portStatus) && (
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                  )}
                  {!isCheckingPort && isPortUsedByOther(portStatus) && (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <p className={`text-xs ${
                  isPortUsedByOther(portStatus) ? 'text-red-400' :
                  isPortUsedByOtherWorkflow(portStatus) ? 'text-yellow-400' : 'text-muted-foreground'
                }`}>
                  {isPortUsedByOther(portStatus)
                    ? 'This port is in use by another service. Choose a different port.'
                    : isPortUsedByOtherWorkflow(portStatus)
                    ? `This port is used by workflow "${getPortStatusWorkflowName(portStatus!)}". Choose a different port.`
                    : 'Port number for this workflow\'s webhook server (1024-65535).'}
                </p>
              </div>

              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">Enable Incoming Webhook</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={incomingEnabled}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    incomingEnabled ? 'bg-purple-600' : 'bg-muted'
                  }`}
                  onClick={() => {
                    if (!incomingToken) {
                      handleInitIncomingConfig();
                    } else {
                      handleToggleIncoming(!incomingEnabled);
                    }
                  }}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      incomingEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Token & URL Section */}
              {incomingToken && (
                <>
                  {/* API Token */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">API Token</label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRegenerateToken}
                        disabled={isRegeneratingToken}
                        className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-xs"
                      >
                        {isRegeneratingToken ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3 mr-1" />
                        )}
                        Regenerate
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={incomingToken}
                        readOnly
                        className="bg-background border-border text-muted-foreground font-mono text-xs flex-1"
                      />
                    </div>
                    {incomingTokenCreatedAt && (
                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(incomingTokenCreatedAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Webhook URL */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Webhook URL</label>
                    <div className="flex gap-2">
                      <Input
                        value={generateWebhookUrl(incomingPort, incomingToken)}
                        readOnly
                        className="bg-background border-border text-muted-foreground font-mono text-xs flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={handleCopyUrl}
                        className={`px-3 ${
                          copySuccess
                            ? 'text-green-400 border-green-600'
                            : 'text-foreground border-border hover:bg-accent'
                        }`}
                      >
                        {copySuccess ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      POST request to this URL will trigger the workflow.
                    </p>
                  </div>

                  {/* Usage Example */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Usage Example</label>
                    <div className="bg-background border border-border rounded-lg p-3">
                      <code className="text-xs text-foreground font-mono whitespace-pre-wrap break-all">
{`curl -X POST "${generateWebhookUrl(incomingPort, incomingToken)}"`}
                      </code>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Fixed footer */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-border flex-shrink-0">
          {activeTab === 'outgoing' ? (
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={!enabled || !url || !!urlError || !!jsonError || isTesting}
              className="text-purple-600 dark:text-purple-400 border-purple-600 hover:bg-purple-600/20"
            >
              {isTesting ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-1.5" />
              )}
              Test Webhook
            </Button>
          ) : (
            <div /> // Empty div for spacing
          )}

          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={(enabled && (!url || !!urlError || !!jsonError)) || isPortUsedByOther(portStatus) || isPortUsedByOtherWorkflow(portStatus)}
              className="bg-purple-600 hover:bg-purple-500 text-white"
            >
              <Webhook className="w-4 h-4 mr-1.5" />
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
