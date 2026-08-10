import { useState } from "react";
import {
  CheckCircle2Icon,
  ChevronRightIcon,
  CircleDashedIcon,
  TerminalSquareIcon,
  XCircleIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { safeJsonStringify, type DisplayContentBlock } from "@/lib/message-content";

type ToolCallBlock = Extract<DisplayContentBlock, { type: "tool_call" }>;

const TOOL_LABELS: Record<string, string> = {
  read_file: "读取文件",
  write_file: "写入文件",
  edit_file: "编辑文件",
  list_eva_components: "读取 Eva 组件目录",
  validate_eva_page: "校验活动页",
  create_preview: "创建页面预览",
  write_todos: "更新任务计划",
  task: "委派子智能体",
  ls: "查看目录",
  glob: "查找文件",
  grep: "搜索内容",
};

function argumentSummary(args: unknown): string {
  if (!args || typeof args !== "object") return "查看调用参数";
  const record = args as Record<string, unknown>;
  const summary =
    record.file_path ?? record.path ?? record.description ?? record.query ?? record.command;
  return typeof summary === "string" && summary.trim() ? summary : "查看调用参数";
}

export function ToolCallCard({ block, running }: { block: ToolCallBlock; running: boolean }) {
  const [open, setOpen] = useState(false);
  const failed = Boolean(block.error);
  const StatusIcon = failed ? XCircleIcon : running ? CircleDashedIcon : CheckCircle2Icon;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="max-w-full">
      <Card size="sm" className={cn("bg-muted/20 shadow-none", failed && "border-destructive/40")}>
        <CardHeader className="py-3">
          <CardTitle className="flex min-w-0 items-center gap-2 text-sm">
            <TerminalSquareIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{TOOL_LABELS[block.name] ?? block.name}</span>
          </CardTitle>
          <CardDescription className="truncate">{argumentSummary(block.args)}</CardDescription>
          <CardAction className="flex items-center gap-1">
            <Badge variant={failed ? "destructive" : running ? "warning" : "outline"}>
              <StatusIcon className={cn("size-3", running && "animate-spin")} />
              {failed ? "错误" : running ? "运行中" : "已调用"}
            </Badge>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon-xs" aria-label="展开工具调用参数">
                <ChevronRightIcon className={cn("transition-transform", open && "rotate-90")} />
              </Button>
            </CollapsibleTrigger>
          </CardAction>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="border-t pt-3">
            {block.error && <p className="mb-2 text-sm text-destructive">{block.error}</p>}
            <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-3 text-xs leading-5">
              {safeJsonStringify(block.args)}
            </pre>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
