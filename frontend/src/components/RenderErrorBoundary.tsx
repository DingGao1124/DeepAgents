import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircleIcon, RefreshCwIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface RenderErrorBoundaryProps {
  children: ReactNode;
  title?: string;
}

interface RenderErrorBoundaryState {
  error: Error | null;
}

export class RenderErrorBoundary extends Component<
  RenderErrorBoundaryProps,
  RenderErrorBoundaryState
> {
  state: RenderErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RenderErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Message rendering failed", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>{this.props.title ?? "This content is temporarily unavailable"}</AlertTitle>
        <AlertDescription className="flex flex-col gap-2">
          <span>An unrecognized message format was received. Other content remains available.</span>
          <Button
            variant="outline"
            size="xs"
            className="self-start"
            onClick={() => window.location.reload()}
          >
            <RefreshCwIcon data-icon="inline-start" />
            Reload
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
}
