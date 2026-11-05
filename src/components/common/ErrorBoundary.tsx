import React, { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, RotateCcw } from "lucide-react";
import { Button } from "../ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((props: { error: Error; reset: () => void }) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Enterprise Admin ErrorBoundary Caught]:", error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  public reset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render(): React.ReactNode {
    if (this.state.hasError) {
      if (typeof this.props.fallback === "function" && this.state.error) {
        return this.props.fallback({ error: this.state.error, reset: this.reset });
      }

      if (this.props.fallback && typeof this.props.fallback !== "function") {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] w-full flex items-center justify-center p-6" role="alert" aria-live="assertive">
          <div className="max-w-md w-full bg-card border border-border shadow-md rounded-xl p-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-foreground">Something went wrong</h2>
              <p className="text-sm text-muted-foreground">
                This page encountered an unexpected application error. You can try refreshing the view or returning to the dashboard.
              </p>
            </div>

            {/* Development-only error hint, stripped in production */}
            {process.env.NODE_ENV !== "production" && this.state.error && (
              <div className="p-3 bg-muted rounded-md text-left overflow-auto max-h-32 text-xs font-mono text-muted-foreground">
                <p className="font-bold text-destructive mb-1">{this.state.error.name}: {this.state.error.message}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
              <Button onClick={this.reset} variant="default" size="sm" className="w-full sm:w-auto">
                <RotateCcw className="mr-2 h-4 w-4" /> Try Again
              </Button>
              <Button onClick={() => window.location.href = '/'} variant="outline" size="sm" className="w-full sm:w-auto">
                <Home className="mr-2 h-4 w-4" /> Dashboard
              </Button>
              <Button onClick={() => window.location.reload()} variant="ghost" size="sm" className="w-full sm:w-auto">
                <RefreshCw className="mr-2 h-4 w-4" /> Reload
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
