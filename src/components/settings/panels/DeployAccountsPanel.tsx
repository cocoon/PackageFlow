/**
 * Deploy Accounts Settings Panel
 * Manage deployment accounts for various platforms
 */

import React, { useCallback } from 'react';
import { Users } from 'lucide-react';
import { useDeployAccounts } from '../../../hooks/useDeployAccounts';
import { AccountManager } from '../../project/deploy/AccountManager';
import type { PlatformType } from '../../../types/deploy';

export const DeployAccountsPanel: React.FC = () => {
  const {
    accounts,
    preferences,
    addingPlatform,
    removingAccountId,
    error,
    addAccount,
    removeAccount,
    updateAccountDisplayName,
    setDefaultAccount,
    refreshAccounts,
    checkUsage,
  } = useDeployAccounts();

  const handleAddAccount = useCallback(
    async (platform: PlatformType): Promise<void> => {
      await addAccount(platform);
    },
    [addAccount]
  );

  const handleUpdateDisplayName = useCallback(
    async (accountId: string, displayName?: string): Promise<void> => {
      await updateAccountDisplayName(accountId, displayName);
    },
    [updateAccountDisplayName]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5" />
          Deploy Accounts
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage accounts for deploying to various platforms
        </p>
      </div>

      {/* Account Manager */}
      <AccountManager
        accounts={accounts}
        preferences={preferences}
        addingPlatform={addingPlatform}
        removingAccountId={removingAccountId}
        error={error}
        onAddAccount={handleAddAccount}
        onRemoveAccount={removeAccount}
        onUpdateDisplayName={handleUpdateDisplayName}
        onSetDefaultAccount={setDefaultAccount}
        onRefreshAccounts={refreshAccounts}
        onCheckUsage={checkUsage}
      />
    </div>
  );
};
