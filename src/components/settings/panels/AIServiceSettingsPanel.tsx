/**
 * AI Service Settings Panel
 * Embedded version of AIServiceSettingsDialog for the Settings page
 */

import { useState, useCallback, useId, useMemo } from 'react';
import {
  Bot,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Wifi,
  WifiOff,
  Star,
  Edit2,
  RefreshCw,
  Eye,
  EyeOff,
  Shield,
  Cloud,
  Server,
} from 'lucide-react';
import { useAIService } from '../../../hooks/useAIService';
import { DeleteConfirmDialog } from '../../ui/ConfirmDialog';
import { Select, type SelectOption } from '../../ui/Select';
import type {
  AIProvider,
  AIServiceConfig,
  AddServiceRequest,
  TestConnectionResult,
  ModelInfo,
} from '../../../types/ai';
import { AI_PROVIDERS, getProviderInfo, providerRequiresApiKey } from '../../../types/ai';
import { cn } from '../../../lib/utils';

export function AIServiceSettingsPanel() {
  const {
    services,
    isLoadingServices,
    servicesError,
    addService,
    updateService,
    deleteService,
    setDefaultService,
    testConnection,
    listModels,
    probeModels,
  } = useAIService({ autoLoad: true });

  // UI state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingService, setEditingService] = useState<AIServiceConfig | null>(null);
  const [testingServiceId, setTestingServiceId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, TestConnectionResult>>({});
  const [loadingModels, setLoadingModels] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<Record<string, ModelInfo[]>>({});
  const [formModels, setFormModels] = useState<ModelInfo[]>([]);
  const [isProbingModels, setIsProbingModels] = useState(false);
  const [probeError, setProbeError] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<AIServiceConfig | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<AddServiceRequest>({
    name: '',
    provider: 'ollama',
    endpoint: 'http://127.0.0.1:11434',
    model: 'llama3.2',
    apiKey: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const formId = useId();

  // Handle provider change - update defaults
  const handleProviderChange = useCallback((provider: AIProvider) => {
    const info = getProviderInfo(provider);
    if (info) {
      setFormData((prev) => ({
        ...prev,
        provider,
        endpoint: info.defaultEndpoint,
        model: info.defaultModel,
        apiKey: '',
      }));
    }
    setShowApiKey(false);
    setFormModels([]);
    setProbeError(null);
  }, []);

  // Start adding new service
  const handleStartAdd = useCallback(() => {
    setShowAddForm(true);
    setEditingService(null);
    setFormError(null);
    setShowApiKey(false);
    setFormModels([]);
    setProbeError(null);
    const defaultProvider = AI_PROVIDERS[3]; // Ollama - local first for privacy
    setFormData({
      name: '',
      provider: defaultProvider.id,
      endpoint: defaultProvider.defaultEndpoint,
      model: defaultProvider.defaultModel,
      apiKey: '',
    });
  }, []);

  // Start editing service
  const handleStartEdit = useCallback((service: AIServiceConfig) => {
    setEditingService(service);
    setShowAddForm(false);
    setFormError(null);
    setShowApiKey(false);
    setFormModels([]);
    setProbeError(null);
    setFormData({
      name: service.name,
      provider: service.provider,
      endpoint: service.endpoint,
      model: service.model,
      apiKey: '',
    });
  }, []);

  // Cancel form
  const handleCancelForm = useCallback(() => {
    setShowAddForm(false);
    setEditingService(null);
    setFormError(null);
    setShowApiKey(false);
    setFormModels([]);
    setProbeError(null);
  }, []);

  // Submit form (add or update)
  const handleSubmit = useCallback(async () => {
    if (!formData.name.trim()) {
      setFormError('Please enter a service name');
      return;
    }
    if (!formData.endpoint.trim()) {
      setFormError('Please enter an API endpoint');
      return;
    }
    if (!formData.model.trim()) {
      setFormError('Please enter a model name');
      return;
    }
    if (providerRequiresApiKey(formData.provider) && !editingService && !formData.apiKey?.trim()) {
      setFormError('Please enter an API key');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingService) {
        const result = await updateService({
          id: editingService.id,
          name: formData.name,
          endpoint: formData.endpoint,
          model: formData.model,
          apiKey: formData.apiKey || undefined,
        });
        if (result) {
          setEditingService(null);
        }
      } else {
        const result = await addService(formData);
        if (result) {
          setShowAddForm(false);
        }
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, editingService, addService, updateService]);

  // Test connection
  const handleTestConnection = useCallback(async (service: AIServiceConfig) => {
    setTestingServiceId(service.id);
    try {
      const result = await testConnection(service.id);
      if (result) {
        setTestResult((prev) => ({ ...prev, [service.id]: result }));
      }
    } catch {
      // Error handling in hook
    } finally {
      setTestingServiceId(null);
    }
  }, [testConnection]);

  // Load models
  const handleLoadModels = useCallback(async (service: AIServiceConfig) => {
    setLoadingModels(service.id);
    try {
      const models = await listModels(service.id);
      if (models) {
        setAvailableModels((prev) => ({ ...prev, [service.id]: models }));
      }
    } catch {
      // Error handling in hook
    } finally {
      setLoadingModels(null);
    }
  }, [listModels]);

  // Probe models for current form (used before saving local services)
  const handleProbeModels = useCallback(async () => {
    setProbeError(null);
    setIsProbingModels(true);
    try {
      if (!formData.endpoint.trim()) {
        setProbeError('Please enter an API endpoint first');
        return;
      }

      const needsKey = providerRequiresApiKey(formData.provider);

      const models = await probeModels({
        provider: formData.provider,
        endpoint: formData.endpoint,
        model: formData.model || undefined,
        apiKey: needsKey ? formData.apiKey : undefined,
      });

      setFormModels(models);

      if (models.length === 0) {
        setProbeError('No models found at this endpoint');
      } else if (!formData.model || !models.some((m) => m.name === formData.model)) {
        setFormData((prev) => ({ ...prev, model: models[0].name }));
      }
    } catch (err) {
      setProbeError(err instanceof Error ? err.message : 'Failed to load models');
    } finally {
      setIsProbingModels(false);
    }
  }, [formData, probeModels]);

  // Delete service
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteService(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // Error in hook
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, deleteService]);

  // Group services by type (local vs cloud)
  const localServices = services.filter((s) => !providerRequiresApiKey(s.provider));
  const cloudServices = services.filter((s) => providerRequiresApiKey(s.provider));

  const isFormOpen = showAddForm || editingService !== null;
  const currentProviderInfo = getProviderInfo(formData.provider);
  const requiresApiKey = providerRequiresApiKey(formData.provider);
  const modelOptions = useMemo<SelectOption[]>(() => {
    const values = new Map<string, SelectOption>();
    formModels.forEach((model) => {
      values.set(model.name, {
        value: model.name,
        label: model.name,
        description: model.modifiedAt ? `Updated ${model.modifiedAt}` : undefined,
      });
    });
    if (formData.model && !values.has(formData.model)) {
      values.set(formData.model, { value: formData.model, label: formData.model });
    }
    return Array.from(values.values());
  }, [formModels, formData.model]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Bot className="w-5 h-5" />
            AI Services
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure AI providers for code review, commit messages, and more
          </p>
        </div>
        {!isFormOpen && (
          <button
            onClick={handleStartAdd}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Service
          </button>
        )}
      </div>

      {/* Error display */}
      {servicesError && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-900/30 border border-red-500/30 rounded-lg text-sm text-red-300">
          <AlertCircle className="w-4 h-4" />
          {servicesError}
        </div>
      )}

      {/* Add/Edit Form */}
      {isFormOpen && (
        <div className="p-4 bg-card rounded-lg border border-border space-y-4">
          <h3 className="text-sm font-medium text-foreground">
            {editingService ? 'Edit Service' : 'Add New Service'}
          </h3>

          {formError && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-900/30 border border-red-500/30 rounded text-xs text-red-300">
              <AlertCircle className="w-3.5 h-3.5" />
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Provider */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Provider
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AI_PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => handleProviderChange(provider.id)}
                    disabled={editingService !== null}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors',
                      formData.provider === provider.id
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/50',
                      editingService && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {!provider.requiresApiKey ? (
                      <Server className="w-4 h-4" />
                    ) : (
                      <Cloud className="w-4 h-4" />
                    )}
                    <span>{provider.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label htmlFor={`${formId}-name`} className="block text-xs font-medium text-muted-foreground mb-2.5">
                Service Name
              </label>
              <input
                id={`${formId}-name`}
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={`My ${currentProviderInfo?.name || 'AI'} Service`}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>

            {/* Model */}
            <div>
              <div className="flex items-center justify-between gap-2 relative">
                <label htmlFor={`${formId}-model`} className="block text-xs font-medium text-muted-foreground mb-1">
                  Model
                </label>
                <button
                  type="button"
                  onClick={handleProbeModels}
                  disabled={isProbingModels || (requiresApiKey && !formData.apiKey)}
                  className="text-xs px-2 py-1 border border-border rounded hover:border-primary hover:text-primary disabled:opacity-50 -translate-y-2"
                >
                  {isProbingModels ? 'Loading…' : 'Load installed models'}
                </button>
              </div>

              {isProbingModels || modelOptions.length > 0 ? (
                <div className="space-y-1">
                  <Select
                    value={formData.model}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, model: val }))}
                    options={modelOptions}
                    placeholder="Choose an installed model"
                    aria-label="Installed model"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Pick from models discovered at the endpoint.
                  </p>
                </div>
              ): 
                <div className="space-y-1">
                  <input
                    id={`${formId}-model`}
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData((prev) => ({ ...prev, model: e.target.value }))}
                    placeholder={currentProviderInfo?.defaultModel || 'model-name'}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Enter the model name (or load installed models).
                  </p>
                </div>
              }

              {probeError && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {probeError}
                </p>
              )}
            </div>

            {/* Endpoint */}
            <div className="col-span-2">
              <label htmlFor={`${formId}-endpoint`} className="block text-xs font-medium text-muted-foreground mb-1">
                API Endpoint
              </label>
              <input
                id={`${formId}-endpoint`}
                type="text"
                value={formData.endpoint}
                onChange={(e) => setFormData((prev) => ({ ...prev, endpoint: e.target.value }))}
                placeholder={currentProviderInfo?.defaultEndpoint || 'https://api.example.com'}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-primary"
              />
            </div>

            {/* API Key (for cloud providers) */}
            {requiresApiKey && (
              <div className="col-span-2">
                <label htmlFor={`${formId}-apikey`} className="block text-xs font-medium text-muted-foreground mb-1">
                  API Key {editingService && <span className="text-muted-foreground">(leave empty to keep current)</span>}
                </label>
                <div className="relative">
                  <input
                    id={`${formId}-apikey`}
                    type={showApiKey ? 'text' : 'password'}
                    value={formData.apiKey || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, apiKey: e.target.value }))}
                    placeholder={editingService ? '••••••••' : 'sk-...'}
                    className="w-full px-3 py-2 pr-10 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Stored securely in system keychain
                </p>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCancelForm}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingService ? 'Update' : 'Add Service'}
            </button>
          </div>
        </div>
      )}

      {/* Services List */}
      {isLoadingServices ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No AI services configured</p>
          <p className="text-sm">Add a service to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Local Services */}
          {localServices.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                <Server className="w-3.5 h-3.5" />
                Local Services (Privacy-First)
              </h3>
              <div className="space-y-2">
                {localServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    testResult={testResult[service.id]}
                    isTesting={testingServiceId === service.id}
                    isLoadingModels={loadingModels === service.id}
                    availableModels={availableModels[service.id]}
                    onEdit={() => handleStartEdit(service)}
                    onDelete={() => setDeleteTarget(service)}
                    onSetDefault={() => setDefaultService(service.id)}
                    onTest={() => handleTestConnection(service)}
                    onLoadModels={() => handleLoadModels(service)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Cloud Services */}
          {cloudServices.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                <Cloud className="w-3.5 h-3.5" />
                Cloud Services
              </h3>
              <div className="space-y-2">
                {cloudServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    testResult={testResult[service.id]}
                    isTesting={testingServiceId === service.id}
                    isLoadingModels={loadingModels === service.id}
                    availableModels={availableModels[service.id]}
                    onEdit={() => handleStartEdit(service)}
                    onDelete={() => setDeleteTarget(service)}
                    onSetDefault={() => setDefaultService(service.id)}
                    onTest={() => handleTestConnection(service)}
                    onLoadModels={() => handleLoadModels(service)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        itemType="AI Service"
        itemName={deleteTarget?.name || ''}
        isLoading={isDeleting}
      />
    </div>
  );
}

interface ServiceCardProps {
  service: AIServiceConfig;
  testResult?: TestConnectionResult;
  isTesting: boolean;
  isLoadingModels: boolean;
  availableModels?: ModelInfo[];
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  onTest: () => void;
  onLoadModels: () => void;
}

function ServiceCard({
  service,
  testResult,
  isTesting,
  isLoadingModels,
  availableModels,
  onEdit,
  onDelete,
  onSetDefault,
  onTest,
  onLoadModels,
}: ServiceCardProps) {
  const providerInfo = getProviderInfo(service.provider);
  const isLocal = !providerRequiresApiKey(service.provider);

  return (
    <div className="p-4 bg-card rounded-lg border border-border">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {/* Status indicator */}
          <div
            className={cn(
              'w-2 h-2 rounded-full mt-2',
              testResult?.success === true
                ? 'bg-green-400'
                : testResult?.success === false
                ? 'bg-red-400'
                : 'bg-muted-foreground/30'
            )}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{service.name}</span>
              {service.isDefault && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                  <Star className="w-3 h-3" />
                  Default
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {providerInfo?.name} • {service.model}
            </div>
            {testResult && (
              <div
                className={cn(
                  'text-xs mt-1',
                  testResult.success ? 'text-green-400' : 'text-red-400'
                )}
              >
                {testResult.success ? (
                  <span className="flex items-center gap-1">
                    <Wifi className="w-3 h-3" />
                    Connected ({testResult.latencyMs}ms)
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <WifiOff className="w-3 h-3" />
                    {testResult.error || 'Connection failed'}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onTest}
            disabled={isTesting}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
            title="Test connection"
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wifi className="w-4 h-4" />
            )}
          </button>
          {isLocal && (
            <button
              onClick={onLoadModels}
              disabled={isLoadingModels}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
              title="Load available models"
            >
              {isLoadingModels ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </button>
          )}
          {!service.isDefault && (
            <button
              onClick={onSetDefault}
              className="p-2 text-muted-foreground hover:text-yellow-400 hover:bg-accent rounded transition-colors"
              title="Set as default"
            >
              <Star className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onEdit}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
            title="Edit service"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-muted-foreground hover:text-red-400 hover:bg-accent rounded transition-colors"
            title="Delete service"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Available models (for local services) */}
      {availableModels && availableModels.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Available Models ({availableModels.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {availableModels.slice(0, 10).map((model) => (
              <span
                key={model.name}
                className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs"
              >
                {model.name}
              </span>
            ))}
            {availableModels.length > 10 && (
              <span className="px-2 py-0.5 text-muted-foreground text-xs">
                +{availableModels.length - 10} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
