import { useState } from "react";
import type { AnyStream, SubagentDiscoverySnapshot } from "@langchain/react";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  FileIcon,
  FileMusicIcon,
  FileVideoIcon,
  ImageIcon,
  WrenchIcon,
} from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { ReasoningBlock } from "@/components/ReasoningBlock";
import { RenderErrorBoundary } from "@/components/RenderErrorBoundary";
import { SubagentCard } from "@/components/SubagentCard";
import { ToolCallCard } from "@/components/ToolCallCard";
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment";
import { Badge } from "@/components/ui/badge";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  parseMessageContent,
  safeJsonStringify,
  toDisplayText,
  type DisplayContentBlock,
} from "@/lib/message-content";
import { cn } from "@/lib/utils";

type MediaBlock = Extract<DisplayContentBlock, { type: "media" }>;
type ResultBlock = Extract<DisplayContentBlock, { type: "tool_result" }>;
type UnknownBlock = Extract<DisplayContentBlock, { type: "unknown" }>;

function MediaAttachment({ block }: { block: MediaBlock }) {
  const Icon =
    block.mediaType === "image"
      ? ImageIcon
      : block.mediaType === "video"
        ? FileVideoIcon
        : block.mediaType === "audio"
          ? FileMusicIcon
          : FileIcon;
  const title = block.title ?? `${block.mediaType} attachment`;

  return (
    <Attachment className="max-w-md">
      <AttachmentMedia variant={block.mediaType === "image" && block.url ? "image" : "icon"}>
        {block.mediaType === "image" && block.url ? (
          <img src={block.url} alt={title} loading="lazy" />
        ) : (
          <Icon />
        )}
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{title}</AttachmentTitle>
        <AttachmentDescription>
          {block.mimeType ?? block.fileId ?? block.url ?? "Media content"}
        </AttachmentDescription>
      </AttachmentContent>
      {block.url && (
        <AttachmentTrigger asChild>
          <a href={block.url} target="_blank" rel="noreferrer noopener" aria-label={`Open ${title}`} />
        </AttachmentTrigger>
      )}
    </Attachment>
  );
}

function ToolResultCard({ block }: { block: ResultBlock }) {
  const [open, setOpen] = useState(false);
  const failed = block.status === "error";
  const summary = toDisplayText(block.output).trim().split("\n")[0] || "Tool returned a result";

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card size="sm" className={cn("bg-muted/20 shadow-none", failed && "border-destructive/40")}>
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            {failed ? <AlertCircleIcon className="size-4 text-destructive" /> : <CheckCircle2Icon className="size-4 text-success" />}
            {block.name ? `${block.name} result` : "Tool result"}
            <Badge variant={failed ? "destructive" : "outline"}>{failed ? "Failed" : "Complete"}</Badge>
          </CardTitle>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon-xs" className="ml-auto" aria-label="Expand tool result">
              <ChevronRightIcon className={cn("transition-transform", open && "rotate-90")} />
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="border-t pt-3">
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs leading-5">
              {summary === toDisplayText(block.output).trim()
                ? summary
                : safeJsonStringify(block.output)}
            </pre>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function UnknownContentCard({ block }: { block: UnknownBlock }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card size="sm" className="border-dashed bg-muted/20 shadow-none">
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
            <WrenchIcon className="size-4" />
            Unrecognized content block: {block.blockType}
          </CardTitle>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon-xs" className="ml-auto" aria-label="Expand raw content">
              <ChevronRightIcon className={cn("transition-transform", open && "rotate-90")} />
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="border-t pt-3">
            <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-3 text-xs leading-5">
              {safeJsonStringify(block.data)}
            </pre>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function MessageContentRenderer({
  message,
  role,
  streaming,
  stream,
  subagentsByCallId,
}: {
  message: unknown;
  role: "human" | "ai";
  streaming: boolean;
  stream: AnyStream;
  subagentsByCallId: Map<string, SubagentDiscoverySnapshot>;
}) {
  const blocks = parseMessageContent(message);
  const attachedSubagents = new Map<string, SubagentDiscoverySnapshot>();

  blocks.forEach((block) => {
    if (block.type !== "tool_call" || !block.id) return;
    const subagent = subagentsByCallId.get(block.id);
    if (subagent) attachedSubagents.set(subagent.id, subagent);
  });

  return (
    <>
      {blocks.map((block) => {
        if (block.type === "text") {
          return (
            <Bubble key={block.key} variant={role === "human" ? "secondary" : "ghost"} align={role === "human" ? "end" : "start"}>
              <BubbleContent className={role === "ai" ? "w-full" : undefined}>
                <Markdown content={block.text} />
              </BubbleContent>
            </Bubble>
          );
        }

        if (block.type === "reasoning") {
          return <ReasoningBlock key={block.key} reasoning={block.reasoning} streaming={streaming} />;
        }

        if (block.type === "tool_call") {
          if (block.id && attachedSubagents.has(block.id)) return null;
          return <ToolCallCard key={block.key} block={block} running={streaming} />;
        }

        if (block.type === "tool_result") return <ToolResultCard key={block.key} block={block} />;
        if (block.type === "media") return <MediaAttachment key={block.key} block={block} />;
        return <UnknownContentCard key={block.key} block={block} />;
      })}

      {attachedSubagents.size > 0 && (
        <div className="flex flex-col gap-2 border-l-2 pl-3">
          {[...attachedSubagents.values()].map((subagent) => (
            <RenderErrorBoundary key={subagent.id} title={`${subagent.name} output is temporarily unavailable`}>
              <SubagentCard stream={stream} subagent={subagent} />
            </RenderErrorBoundary>
          ))}
        </div>
      )}
    </>
  );
}
