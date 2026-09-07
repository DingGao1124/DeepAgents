import { useState } from "react";
import {
  ChevronRightIcon,
  TerminalSquareIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { safeJsonStringify, type DisplayContentBlock } from "@/lib/message-content";

type ToolCallBlock = Extract<DisplayContentBlock, { type: "tool_call" }>;

const TOOL_LABELS: Record<string, string> = {
  read_file: "Read file",
  write_file: "Write file",
  edit_file: "Edit file",
  validate_html_page: "Validate HTML page",
  create_preview: "Create page preview",
  write_todos: "Update task plan",
  task: "Delegate to subagent",
  ls: "List directory",
  glob: "Find files",
  grep: "Search content",
};

function argumentSummary(args: unknown): string {
  if (!args || typeof args !== "object") return "";
  const record = args as Record<string, unknown>;
  const summary =
    record.file_path ?? record.path ?? record.description ?? record.query ?? record.command;
  return typeof summary === "string" && summary.trim() ? summary : "";
}

export function ToolCallCard({ block, running }: { block: ToolCallBlock; running: boolean }) {
  const [open, setOpen] = useState(false);
  const failed = Boolean(block.error);
  const label = TOOL_LABELS[block.name] ?? block.name;
  const summary = argumentSummary(block.args);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="max-w-full">
      <div
        className={cn(
          "group/tool flex items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs transition-colors",
          "bg-muted/25 hover:bg-muted/40",
          failed && "border-destructive/30 bg-destructive/5 hover:bg-destructive/8",
        )}
      >
        <TerminalSquareIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
        <span className="shrink-0 font-medium text-foreground/80">{label}</span>
        {summary && (
          <>
            <span className="shrink-0 text-[10px] text-muted-foreground/40">·</span>
            <span className="min-w-0 truncate text-muted-foreground/70">{summary}</span>
          </>
        )}
        <span
          className={cn(
            "ml-auto size-1.5 shrink-0 rounded-full ring-1 ring-inset",
            failed
              ? "bg-destructive ring-destructive/20"
              : running
                ? "bg-warning ring-warning/20 animate-pulse"
                : "bg-success ring-success/20",
          )}
          title={failed ? "Error" : running ? "Running" : "Complete"}
        />
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            className="-mr-1 shrink-0 opacity-50 transition-opacity group-hover/tool:opacity-100"
            aria-label="Expand details"
          >
            <ChevronRightIcon className={cn("size-3 transition-transform", open && "rotate-90")} />
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="mt-1 overflow-hidden rounded-lg border border-border/40 bg-muted/15 px-3 py-2">
          {block.error && (
            <p className="mb-1.5 text-xs text-destructive">{block.error}</p>
          )}
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-muted/40 p-2 text-[11px] leading-relaxed text-muted-foreground">
            {safeJsonStringify(block.args)}
          </pre>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
