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
        <AlertTitle>{this.props.title ?? "这部分内容暂时无法显示"}</AlertTitle>
        <AlertDescription className="flex flex-col gap-2">
          <span>收到了一条无法识别的消息格式，其他内容仍可继续使用。</span>
          <Button
            variant="outline"
            size="xs"
            className="self-start"
            onClick={() => window.location.reload()}
          >
            <RefreshCwIcon data-icon="inline-start" />
            重新加载
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
}
