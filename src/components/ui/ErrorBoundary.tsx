/**
 * Error Boundary Component
 * Catches JavaScript errors in child components
 * @see specs/001-worktree-enhancements/tasks.md - T056
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  title?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-red-400" />
          <h3 className="text-lg font-medium text-red-300 mb-2">
            {this.props.title || 'Something went wrong'}
          </h3>
          <p className="text-sm text-red-400/80 mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button
            onClick={this.handleReset}
            variant="outline"
            className="text-red-400 border-red-400/30 hover:bg-red-500/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Worktree-specific error boundary with context-aware messaging
 */
export function WorktreeErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      title="Worktree Error"
      onError={(error) => {
        console.error('Worktree component error:', error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
