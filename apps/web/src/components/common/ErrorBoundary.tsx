import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by Web ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl text-center">
            <div className="h-16 w-16 bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
              <AlertTriangle size={32} />
            </div>

            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Something went wrong
            </h2>

            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              We encountered an unexpected error while rendering this page. Our team has been notified.
            </p>

            {this.state.error?.message && (
              <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-left overflow-x-auto max-h-24">
                <p className="font-mono text-[11px] text-rose-600 dark:text-rose-400">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-sm"
              >
                <RefreshCw size={14} />
                <span>Reload Page</span>
              </button>

              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <Home size={14} />
                <span>Go to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

