import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, RotateCcw } from 'lucide-react';

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
    console.error('Desktop App Crash caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleBackToDashboard = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = '#/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-slate-100 dark:bg-slate-950">
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-2xl text-center">
            <div className="h-16 w-16 bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
              <AlertOctagon size={32} />
            </div>

            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Admin Console Runtime Error
            </h2>

            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              An unhandled exception occurred in the Electron desktop renderer. You can attempt to reload the current view or return to the main Dashboard.
            </p>

            {this.state.error?.message && (
              <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-left overflow-x-auto max-h-32">
                <p className="font-mono text-[11px] text-rose-600 dark:text-rose-400">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 text-xs font-bold transition shadow-sm"
              >
                <RefreshCw size={14} />
                <span>Reload Window</span>
              </button>

              <button
                onClick={this.handleBackToDashboard}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                <RotateCcw size={14} />
                <span>Return to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

