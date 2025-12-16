/**
 * Notification Settings Panel
 * Configure desktop notification preferences including categories and DND settings
 *
 * Features:
 * - Master notification toggle with visual status
 * - Sound preference control
 * - Category-based notification toggles
 * - Do Not Disturb scheduling
 * - Consistent design with Storage and Data panels
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  Volume2,
  VolumeX,
  Webhook,
  Play,
  GitBranch,
  Shield,
  Rocket,
  Moon,
  Clock,
  Loader2,
  CheckCircle2,
  BellOff,
  Info,
} from 'lucide-react';
import { notificationAPI } from '../../../lib/tauri-api';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  NOTIFICATION_CATEGORIES,
  type NotificationSettings,
  type NotificationCategoryId,
} from '../../../types/notification';
import { Toggle } from '../../ui/Toggle';
import { SettingSection } from '../ui/SettingSection';
import { SettingInfoBox } from '../ui/SettingInfoBox';
import { Skeleton } from '../../ui/Skeleton';
import { cn } from '../../../lib/utils';

// Icon mapping for notification categories
const CATEGORY_ICONS: Record<NotificationCategoryId, React.ElementType> = {
  webhooks: Webhook,
  workflowExecution: Play,
  gitOperations: GitBranch,
  securityScans: Shield,
  deployments: Rocket,
};

// Color mapping for notification categories
const CATEGORY_COLORS: Record<
  NotificationCategoryId,
  { border: string; iconBg: string; iconColor: string }
> = {
  webhooks: {
    border: 'border-purple-500/20',
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  workflowExecution: {
    border: 'border-blue-500/20',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  gitOperations: {
    border: 'border-green-500/20',
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  securityScans: {
    border: 'border-amber-500/20',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  deployments: {
    border: 'border-cyan-500/20',
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
  },
};

export const NotificationSettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loaded = await notificationAPI.loadSettings();
        setSettings(loaded);
      } catch (error) {
        console.error('Failed to load notification settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  // Save settings helper
  const saveSettings = useCallback(async (newSettings: NotificationSettings) => {
    setIsSaving(true);
    try {
      await notificationAPI.saveSettings(newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Toggle master switch
  const handleMasterToggle = useCallback(() => {
    saveSettings({ ...settings, enabled: !settings.enabled });
  }, [settings, saveSettings]);

  // Toggle sound
  const handleSoundToggle = useCallback(() => {
    saveSettings({ ...settings, soundEnabled: !settings.soundEnabled });
  }, [settings, saveSettings]);

  // Toggle category
  const handleCategoryToggle = useCallback(
    (categoryId: NotificationCategoryId) => {
      const newCategories = {
        ...settings.categories,
        [categoryId]: !settings.categories[categoryId],
      };
      saveSettings({ ...settings, categories: newCategories });
    },
    [settings, saveSettings]
  );

  // Toggle DND
  const handleDndToggle = useCallback(() => {
    saveSettings({
      ...settings,
      doNotDisturb: {
        ...settings.doNotDisturb,
        enabled: !settings.doNotDisturb.enabled,
      },
    });
  }, [settings, saveSettings]);

  // Update DND time
  const handleDndTimeChange = useCallback(
    (field: 'startTime' | 'endTime', value: string) => {
      saveSettings({
        ...settings,
        doNotDisturb: {
          ...settings.doNotDisturb,
          [field]: value,
        },
      });
    },
    [settings, saveSettings]
  );

  // Count enabled categories
  const enabledCategoryCount = Object.values(settings.categories).filter(Boolean).length;
  const totalCategoryCount = NOTIFICATION_CATEGORIES.length;

  if (isLoading) {
    return <NotificationSettingsSkeleton />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Fixed Header */}
      <div className="flex-shrink-0 pb-4 border-b border-border bg-background">
        <h2 className="text-xl font-semibold text-foreground flex items-center">
          <Bell className="w-5 h-5 pr-1" />
          Notifications
          {isSaving && <Loader2 className="w-4 h-4 ml-2 text-muted-foreground animate-spin" />}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure desktop notification preferences
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pt-4 space-y-6">
      {/* Master Control Section */}
      <SettingSection
        title="Notification Status"
        description="Control all desktop notifications"
        icon={<Bell className="w-4 h-4" />}
      >
        <div
          className={cn(
            'group relative p-4 rounded-lg',
            'bg-gradient-to-r',
            settings.enabled
              ? 'from-green-500/5 via-transparent to-transparent border-green-500/20'
              : 'from-muted/50 via-transparent to-transparent border-border',
            'border',
            'transition-colors'
          )}
        >
          <div className="flex items-start gap-3">
            {/* Status Icon */}
            <div
              className={cn(
                'flex-shrink-0 p-2.5 rounded-lg',
                settings.enabled
                  ? 'bg-green-500/10 text-green-500 dark:text-green-400'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {settings.enabled ? (
                <Bell className="w-5 h-5" />
              ) : (
                <BellOff className="w-5 h-5" />
              )}
            </div>

            {/* Status Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  Desktop Notifications
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border',
                    settings.enabled
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
                      : 'bg-muted text-muted-foreground border-border'
                  )}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {settings.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {settings.enabled
                  ? `Receiving notifications for ${enabledCategoryCount} of ${totalCategoryCount} categories`
                  : 'All notifications are currently disabled'}
              </p>
            </div>

            {/* Toggle */}
            <div className="flex-shrink-0">
              <Toggle
                checked={settings.enabled}
                onChange={handleMasterToggle}
                aria-label="Enable notifications"
              />
            </div>
          </div>
        </div>

        {/* Sound Setting */}
        <SoundSettingCard
          enabled={settings.soundEnabled}
          disabled={!settings.enabled}
          onToggle={handleSoundToggle}
        />
      </SettingSection>

      {/* Categories Section */}
      <SettingSection
        title="Notification Categories"
        description="Choose which types of events trigger notifications"
        icon={<Bell className="w-4 h-4" />}
      >
        <div className="grid gap-3">
          {NOTIFICATION_CATEGORIES.map((category) => {
            const Icon = CATEGORY_ICONS[category.id];
            const colors = CATEGORY_COLORS[category.id];
            const isEnabled = settings.categories[category.id];

            return (
              <CategoryCard
                key={category.id}
                icon={<Icon className="w-4 h-4" />}
                title={category.label}
                description={category.description}
                enabled={isEnabled}
                disabled={!settings.enabled}
                colors={colors}
                onToggle={() => handleCategoryToggle(category.id)}
              />
            );
          })}
        </div>
      </SettingSection>

      {/* Do Not Disturb Section */}
      <SettingSection
        title="Do Not Disturb"
        description="Schedule quiet hours when notifications are suppressed"
        icon={<Moon className="w-4 h-4" />}
      >
        <div
          className={cn(
            'group relative p-4 rounded-lg',
            'bg-gradient-to-r',
            settings.doNotDisturb.enabled && settings.enabled
              ? 'from-indigo-500/5 via-transparent to-transparent border-indigo-500/20'
              : 'from-muted/30 via-transparent to-transparent border-border',
            'border',
            'transition-colors'
          )}
        >
          <div className="flex items-start gap-3">
            {/* DND Icon */}
            <div
              className={cn(
                'flex-shrink-0 p-2.5 rounded-lg',
                settings.doNotDisturb.enabled && settings.enabled
                  ? 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <Moon className="w-5 h-5" />
            </div>

            {/* DND Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">Quiet Hours</span>
                {settings.doNotDisturb.enabled && settings.enabled && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
                      'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                    )}
                  >
                    <Clock className="w-3 h-3" />
                    {settings.doNotDisturb.startTime} - {settings.doNotDisturb.endTime}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {settings.doNotDisturb.enabled && settings.enabled
                  ? 'Notifications will be silenced during quiet hours'
                  : 'Enable to suppress notifications during specified hours'}
              </p>
            </div>

            {/* Toggle */}
            <div className="flex-shrink-0">
              <Toggle
                checked={settings.doNotDisturb.enabled}
                onChange={handleDndToggle}
                disabled={!settings.enabled}
                aria-label="Enable do not disturb"
              />
            </div>
          </div>

          {/* Time Picker */}
          {settings.enabled && settings.doNotDisturb.enabled && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Schedule</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label htmlFor="dnd-start" className="text-sm text-muted-foreground">
                    From
                  </label>
                  <input
                    id="dnd-start"
                    type="time"
                    value={settings.doNotDisturb.startTime}
                    onChange={(e) => handleDndTimeChange('startTime', e.target.value)}
                    className={cn(
                      'px-2 py-1.5 rounded-md border border-input bg-background text-sm',
                      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                      'transition-colors'
                    )}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="dnd-end" className="text-sm text-muted-foreground">
                    To
                  </label>
                  <input
                    id="dnd-end"
                    type="time"
                    value={settings.doNotDisturb.endTime}
                    onChange={(e) => handleDndTimeChange('endTime', e.target.value)}
                    className={cn(
                      'px-2 py-1.5 rounded-md border border-input bg-background text-sm',
                      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                      'transition-colors'
                    )}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </SettingSection>

      {/* Tips Info Box */}
      <SettingInfoBox title="Tips" variant="info">
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 pr-1 mt-0.5 flex-shrink-0 text-blue-500" />
            <span>Notifications use your system's native notification center</span>
          </li>
          <li className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 pr-1 mt-0.5 flex-shrink-0 text-blue-500" />
            <span>
              You can also manage notifications in your system's <strong>Settings</strong> app
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 pr-1 mt-0.5 flex-shrink-0 text-blue-500" />
            <span>
              Do Not Disturb times wrap around midnight (e.g., 22:00 to 08:00 is overnight)
            </span>
          </li>
        </ul>
      </SettingInfoBox>
      </div>
    </div>
  );
};

// ============================================================================
// Internal Components
// ============================================================================

/** Loading skeleton for notification settings */
const NotificationSettingsSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header skeleton */}
    <div>
      <Skeleton className="w-40 h-6 mb-2" />
      <Skeleton className="w-64 h-4" />
    </div>

    {/* Master control skeleton */}
    <div className="space-y-3">
      <div className="space-y-1">
        <Skeleton className="w-32 h-4" />
        <Skeleton className="w-48 h-3" />
      </div>
      <div className="p-4 rounded-lg border border-border">
        <div className="flex items-start gap-3">
          <Skeleton className="w-11 h-11 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="w-32 h-4" />
            <Skeleton className="w-48 h-3" />
          </div>
          <Skeleton className="w-10 h-5 rounded-full" />
        </div>
      </div>
      <div className="p-3 rounded-lg border border-border">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="w-28 h-4" />
            <Skeleton className="w-40 h-3" />
          </div>
          <Skeleton className="w-10 h-5 rounded-full" />
        </div>
      </div>
    </div>

    {/* Categories skeleton */}
    <div className="space-y-3">
      <div className="space-y-1">
        <Skeleton className="w-36 h-4" />
        <Skeleton className="w-56 h-3" />
      </div>
      <div className="grid gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-3 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="w-24 h-4" />
                <Skeleton className="w-48 h-3" />
              </div>
              <Skeleton className="w-10 h-5 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* DND skeleton */}
    <div className="space-y-3">
      <div className="space-y-1">
        <Skeleton className="w-28 h-4" />
        <Skeleton className="w-64 h-3" />
      </div>
      <div className="p-4 rounded-lg border border-border">
        <div className="flex items-start gap-3">
          <Skeleton className="w-11 h-11 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-40 h-3" />
          </div>
          <Skeleton className="w-10 h-5 rounded-full" />
        </div>
      </div>
    </div>
  </div>
);

/** Sound setting card component */
interface SoundSettingCardProps {
  enabled: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

const SoundSettingCard: React.FC<SoundSettingCardProps> = ({ enabled, disabled, onToggle }) => {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg',
        'border bg-card',
        disabled ? 'opacity-50' : '',
        enabled ? 'border-blue-500/20' : 'border-border'
      )}
    >
      <div
        className={cn(
          'p-2 rounded-lg flex-shrink-0',
          enabled ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-muted text-muted-foreground'
        )}
      >
        {enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-foreground">Notification Sound</h4>
        <p className="text-xs text-muted-foreground mt-0.5">
          {enabled ? 'Sound plays when notifications appear' : 'Notifications are silent'}
        </p>
      </div>
      <div className="flex-shrink-0">
        <Toggle
          checked={enabled}
          onChange={onToggle}
          disabled={disabled}
          aria-label="Notification sound"
        />
      </div>
    </div>
  );
};

/** Category card component */
interface CategoryCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  disabled?: boolean;
  colors: { border: string; iconBg: string; iconColor: string };
  onToggle: () => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  icon,
  title,
  description,
  enabled,
  disabled,
  colors,
  onToggle,
}) => {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg',
        'border bg-card transition-colors',
        disabled ? 'opacity-50' : '',
        enabled && !disabled ? colors.border : 'border-border'
      )}
    >
      <div
        className={cn(
          'p-2 rounded-lg flex-shrink-0 transition-colors',
          enabled && !disabled ? cn(colors.iconBg, colors.iconColor) : 'bg-muted text-muted-foreground'
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-foreground">{title}</h4>
          {enabled && !disabled && (
            <span
              className={cn(
                'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium',
                colors.iconBg,
                colors.iconColor,
                'border',
                colors.border
              )}
            >
              Active
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{description}</p>
      </div>
      <div className="flex-shrink-0">
        <Toggle
          checked={enabled}
          onChange={onToggle}
          disabled={disabled}
          aria-label={`${title} notifications`}
        />
      </div>
    </div>
  );
};
