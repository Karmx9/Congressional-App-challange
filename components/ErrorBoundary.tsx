import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State;

  // FIX: Replaced public state field with a constructor to initialize state.
  // This can resolve some TypeScript tooling issues that might misinterpret `this` context
  // and cause errors like "Property 'props' does not exist".
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false
    };
  }

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // In a real production app, you would log this to an error reporting service like Sentry or Bugsnag
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div className="card text-center p-8">
            <i className="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
            <h2 className="text-2xl font-semibold text-red-600">Something went wrong.</h2>
            <p className="text-text-secondary mt-2">We've encountered an unexpected error. Please try refreshing the page to continue.</p>
            <button
                onClick={() => window.location.reload()}
                className="mt-6 btn btn-primary"
            >
                Refresh Page
            </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
