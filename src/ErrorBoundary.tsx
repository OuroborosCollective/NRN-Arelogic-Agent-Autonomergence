import React, { Component, ErrorInfo } from 'react';

interface Props {
  children?: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // You could also log the error to an error reporting service here
  }

  private resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
          return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 m-4 bg-red-950/20 border border-red-500/30 rounded-lg text-red-200">
          <h2 className="text-xl font-bold mb-4 text-red-400">System Anomaly Detected</h2>
          <p className="mb-4 font-mono text-sm max-w-lg text-center opacity-80 break-words">
            {this.state.error?.message || "An unexpected error occurred in the simulation component."}
          </p>
          <button
            onClick={this.resetErrorBoundary}
            className="px-4 py-2 bg-red-900/50 hover:bg-red-800/60 border border-red-500/50 rounded-sm font-mono text-sm transition-colors"
          >
            Initiate Self-Heal (Restart Component)
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
