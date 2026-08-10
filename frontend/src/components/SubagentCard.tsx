import { useState } from "react";
import { AIMessage } from "langchain";
import {
  useMessages,
  useToolCalls,
  type AnyStream,
  type SubagentDiscoverySnapshot,
} from "@langchain/react";
import {
  BotIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  CircleDashedIcon,
  CircleIcon,
  XCircleIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/Markdown";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { messageText, toDisplayText } from "@/lib/message-content";

const STATUS_ICON = {
  running: CircleDashedIcon,
  complete: CheckCircle2Icon,
  error: XCircleIcon,
  pending: CircleIcon,
} as const;

export function SubagentCard({
  stream,
  subagent,
}: {
  stream: AnyStream;
  subagent: SubagentDiscoverySnapshot;
}) {
  const [expanded, setExpanded] = useState(true);
  const messages = useMessages(stream, subagent);
  const toolCalls = useToolCalls(stream, subagent);
  const lastAI = messages.filter(AIMessage.isInstance).at(-1);
  const displayContent =
    messageText(lastAI) || toDisplayText((subagent as { output?: unknown }).output);
  const StatusIcon = STATUS_ICON[subagent.status as keyof typeof STATUS_ICON] ?? BotIcon;
  const statusVariant =
    subagent.status === "complete"
      ? "success"
      : subagent.status === "error"
        ? "destructive"
        : subagent.status === "running"
          ? "warning"
          : "secondary";

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 capitalize">
            <StatusIcon
              className={cn(
                "size-4",
                subagent.status === "running" && "animate-spin text-warning",
                subagent.status === "complete" && "text-success",
                subagent.status === "error" && "text-destructive",
              )}
            />
            {subagent.name}
          </CardTitle>
          <CardDescription>
            {toolCalls.length} 次工具调用
            <Badge variant={statusVariant} className="ml-2">
              {subagent.status}
            </Badge>
          </CardDescription>
          <CardAction>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="展开 subagent 输出">
                <ChevronDownIcon className={cn("transition-transform", !expanded && "-rotate-90")} />
              </Button>
            </CollapsibleTrigger>
          </CardAction>
        </CardHeader>
        {displayContent && (
          <CollapsibleContent asChild>
            <CardContent>
              <div className="max-h-80 overflow-y-auto text-muted-foreground">
                <Markdown content={displayContent} className="text-sm" />
                {subagent.status === "running" && (
                  <span className="shimmer ml-1" aria-label="仍在运行">
                    ▍
                  </span>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        )}
      </Card>
    </Collapsible>
  );
}
