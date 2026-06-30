"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { WarningCircle, ArrowLeft } from "@phosphor-icons/react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Log to console in dev — in production, ship to monitoring
    console.error("[Hivemind ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="pt-16 animate-page-in">
          <div className="mx-auto max-w-page px-6 py-12">
            <div className="flex flex-col items-center py-120 text-center">
              {/* Error icon */}
              <div className="w-20 h-20 mx-auto mb-6 rounded-full border border-swarm-fail/20 flex items-center justify-center">
                <WarningCircle size={36} weight="light" className="text-swarm-fail" />
              </div>

              <h2 className="text-4xl text-bone tracking-tight-display mb-2">
                Something went wrong
              </h2>

              <p className="text-base text-ash mb-3 max-w-[400px] leading-relaxed">
                An unexpected error occurred rendering this page.
              </p>

              {/* Error details — hidden in production */}
              {this.state.error && (
                <details className="mb-6">
                  <summary className="text-xs text-smoke cursor-pointer hover:text-ash">
                    Technical details
                  </summary>
                  <pre className="text-left mt-2 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.04] text-xs text-smoke leading-relaxed overflow-auto max-h-48 max-w-lg mx-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}

              <div className="flex gap-3">
                <Button variant="primary" onClick={this.handleReset}>
                  Try Again
                </Button>
                <Button variant="ghost" onClick={this.handleReload}>
                  Reload Page
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
