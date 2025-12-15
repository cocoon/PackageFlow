/**
 * EnvVariablesPreview Component
 * Displays environment variables in a compact preview format
 * Values are masked for security
 */

import React from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Button } from '../../ui/Button';
import { cn } from '../../../lib/utils';

interface EnvVariable {
  key: string;
  value: string;
}

interface EnvVariablesPreviewProps {
  variables: EnvVariable[];
  className?: string;
  maxDisplay?: number;
}

export function EnvVariablesPreview({
  variables,
  className,
  maxDisplay = 5,
}: EnvVariablesPreviewProps) {
  const [showValues, setShowValues] = React.useState(false);

  if (variables.length === 0) {
    return null;
  }

  const displayVariables = variables.slice(0, maxDisplay);
  const remainingCount = variables.length - maxDisplay;

  const maskValue = (value: string) => {
    if (value.length <= 4) {
      return '••••';
    }
    return '••••••••';
  };

  return (
    <div className={cn('rounded-lg border border-border bg-card', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {variables.length} variable{variables.length !== 1 ? 's' : ''}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowValues(!showValues)}
          className={cn('h-auto gap-1.5 text-xs px-1')}
        >
          {showValues ? (
            <>
              <EyeOff className="h-3.5 w-3.5" />
              <span>Hide</span>
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" />
              <span>Show</span>
            </>
          )}
        </Button>
      </div>

      {/* Variable List */}
      <div className="divide-y divide-border">
        {displayVariables.map((variable) => (
          <div
            key={variable.key}
            className="flex items-center gap-3 px-4 py-2.5"
          >
            <code className="text-xs font-medium text-foreground bg-muted px-2 py-0.5 rounded">
              {variable.key}
            </code>
            <span className="text-muted-foreground">=</span>
            <code
              className={cn(
                'text-xs text-muted-foreground truncate flex-1',
                !showValues && 'tracking-wider'
              )}
              title={showValues ? variable.value : undefined}
            >
              {showValues ? variable.value : maskValue(variable.value)}
            </code>
          </div>
        ))}
      </div>

      {/* More indicator */}
      {remainingCount > 0 && (
        <div className="px-4 py-2 border-t border-border bg-muted/30">
          <span className="text-xs text-muted-foreground">
            +{remainingCount} more variable{remainingCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
