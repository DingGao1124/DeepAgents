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
  ChevronRightIcon,
  TerminalIcon,
} from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useAutoScroll } from "@/lib/use-auto-scroll";
import { messageText, toDisplayText } from "@/lib/message-content";

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

function toolArgSummary(args: unknown): string {
  if (!args || typeof args !== "object") return "";
  const record = args as Record<string, unknown>;
  const summary =
    record.file_path ?? record.path ?? record.description ?? record.query ?? record.command;
  return typeof summary === "string" && summary.trim() ? summary : "";
}

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
  const streaming = subagent.status === "running";
  const { containerRef, onScroll } = useAutoScroll(streaming && expanded);

  const failed = subagent.status === "error";
  const done = subagent.status === "complete";
  const runningCount = toolCalls.filter((tc) => tc.status === "running").length;
  const finishedCount = toolCalls.filter((tc) => tc.status === "finished").length;
  const statusLabel = failed ? "失败" : done ? "完成" : streaming ? "运行中" : "等待中";

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div
        className={cn(
          "group/sub flex items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs transition-colors",
          "bg-muted/25 hover:bg-muted/40",
          failed && "border-destructive/30 bg-destructive/5 hover:bg-destructive/8",
        )}
      >
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full ring-1 ring-inset",
            failed
              ? "bg-destructive ring-destructive/20"
              : streaming
                ? "bg-warning ring-warning/20 animate-pulse"
                : done
                  ? "bg-success ring-success/20"
                  : "bg-muted-foreground/40 ring-muted-foreground/20",
          )}
          title={statusLabel}
        />
        <BotIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
        <span className="shrink-0 font-medium text-foreground/80">{subagent.name}</span>
        {toolCalls.length > 0 && (
          <>
            <span className="shrink-0 text-[10px] text-muted-foreground/40">·</span>
            <span className="shrink-0 text-muted-foreground/70">
              {runningCount > 0
                ? `${runningCount}/${toolCalls.length}`
                : `${finishedCount}/${toolCalls.length}`}
            </span>
          </>
        )}
        {!streaming && displayContent && (
          <>
            <span className="shrink-0 text-[10px] text-muted-foreground/40">·</span>
            <span className="min-w-0 truncate text-muted-foreground/60">
              {displayContent.slice(0, 60).replace(/\n/g, " ")}
            </span>
          </>
        )}
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            className="-mr-1 ml-auto shrink-0 opacity-50 transition-opacity group-hover/sub:opacity-100"
            aria-label="展开子智能体详情"
          >
            <ChevronRightIcon className={cn("size-3 transition-transform", expanded && "rotate-90")} />
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <div className="mt-1 overflow-hidden rounded-lg border border-border/40 bg-muted/15">
          {/* 工具调用 */}
          {toolCalls.length > 0 && (
            <div className="px-3 py-2">
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <TerminalIcon className="size-3" />
                工具调用
                <span className="text-muted-foreground/40">{toolCalls.length}</span>
              </div>
              <ul className="flex flex-col gap-0.5">
                {toolCalls.map((tc) => {
                  const label = TOOL_LABELS[tc.name] ?? tc.name;
                  const summary = toolArgSummary(tc.args);
                  const tcFailed = tc.status === "error";
                  const tcRunning = tc.status === "running";
                  const tcDone = tc.status === "finished";

                  return (
                    <li
                      key={tc.id ?? tc.callId}
                      className={cn(
                        "flex items-center gap-1.5 rounded px-2 py-1 text-[11px] leading-relaxed",
                        tcFailed && "text-destructive",
                      )}
                    >
                      <span
                        className={cn(
                          "size-1 shrink-0 rounded-full",
                          tcFailed
                            ? "bg-destructive"
                            : tcRunning
                              ? "bg-warning animate-pulse"
                              : tcDone
                                ? "bg-success"
                                : "bg-muted-foreground/30",
                        )}
                      />
                      <span className="font-medium">{label}</span>
                      {summary && (
                        <>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="truncate text-muted-foreground/70">{summary}</span>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* 输出 */}
          {displayContent && (
            <div
              ref={containerRef}
              onScroll={onScroll}
              className={cn(
                "max-h-60 overflow-y-auto px-3 py-2",
                toolCalls.length > 0 && "border-t border-border/30",
              )}
            >
              <Markdown content={displayContent} className="text-xs text-muted-foreground" />
              {streaming && (
                <span className="shimmer ml-0.5" aria-label="仍在运行">
                  ▍
                </span>
              )}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
