import { useCallback, useEffect, useState } from "react";
import { AlertCircleIcon, MessageCircleIcon, RefreshCwIcon, Trash2Icon, XIcon } from "lucide-react";
import { client } from "../config";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

interface ThreadSummary {
  threadId: string;
  title: string;
  updatedAt: string;
}

function deriveTitle(values: unknown): string {
  const messages =
    (values as { messages?: Array<Record<string, unknown>> } | undefined)?.messages ?? [];

  const firstHuman = messages.find((message) => {
    if (!message || typeof message !== "object") return false;
    // LangGraph may return messages in different formats:
    // 1. Plain { type: "human", content: "..." }
    if (message.type === "human" || message.role === "user") return true;
    // 2. LangChain serialized: { lc: 1, type: "constructor", id: [..., "HumanMessage"] }
    if (Array.isArray(message.id) && message.id.includes("HumanMessage")) return true;
    // 3. Deserialized kwargs.type
    if ((message.kwargs as Record<string, unknown>)?.type === "human") return true;
    return false;
  });

  if (!firstHuman) return "空对话";

  const content =
    firstHuman.content ?? (firstHuman.kwargs as Record<string, unknown>)?.content;

  const raw =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content
            .map((part) =>
              typeof part === "object" && part && "text" in part
                ? String((part as { text?: unknown }).text ?? "")
                : "",
            )
            .join("")
        : "";
  const trimmed = raw.trim().replace(/\s+/g, " ");
  return trimmed ? trimmed.slice(0, 48) : "空对话";
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? new Intl.DateTimeFormat("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date)
    : new Intl.DateTimeFormat("zh-CN", {
        month: "numeric",
        day: "numeric",
      }).format(date);
}

export function ConversationList({
  activeThreadId,
  onSelect,
  onDelete,
  refreshSignal,
}: {
  activeThreadId: string | null;
  onSelect: (threadId: string) => void;
  onDelete: (threadId: string) => void;
  refreshSignal: number;
}) {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await client.threads.search({
        limit: 50,
        sortBy: "updated_at",
        sortOrder: "desc",
      });

      const summaries: ThreadSummary[] = [];
      for (const thread of results) {
        let title = "空对话";
        try {
          const state = await client.threads.getState(thread.thread_id);
          title = deriveTitle(state.values);
        } catch {
          // fall back to default title
        }
        summaries.push({
          threadId: thread.thread_id,
          title,
          updatedAt: thread.updated_at,
        });
      }
      setThreads(summaries);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshSignal]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto pb-3" aria-live="polite">
      {error && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>无法加载历史记录</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span className="line-clamp-2">{error}</span>
            <Button variant="outline" size="xs" onClick={() => void load()}>
              <RefreshCwIcon data-icon="inline-start" />
              重试
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading && threads.length === 0 && (
        <div className="flex flex-col gap-2 px-1">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      )}

      {!loading && threads.length === 0 && !error && (
        <Empty className="min-h-48 p-3">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageCircleIcon />
            </EmptyMedia>
            <EmptyTitle>还没有对话</EmptyTitle>
            <EmptyDescription>发送第一条消息后会保存在这里。</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {threads.length > 0 && (
        <ul className="flex flex-col gap-1">
          {threads.map((thread) => {
            const active = thread.threadId === activeThreadId;
            const confirming = thread.threadId === deletingId;
            return (
              <li key={thread.threadId} className="group relative">
                {confirming ? (
                  <div className="flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1.5">
                    <span className="min-w-0 flex-1 truncate text-xs text-destructive">
                      确认删除？
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-destructive hover:bg-destructive/20"
                      aria-label="确认删除"
                      onClick={() => {
                        onDelete(thread.threadId);
                        setDeletingId(null);
                      }}
                    >
                      <Trash2Icon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="取消"
                      onClick={() => setDeletingId(null)}
                    >
                      <XIcon />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant={active ? "secondary" : "ghost"}
                    className="h-auto w-full justify-start px-2 py-2 text-left"
                    onClick={() => onSelect(thread.threadId)}
                    title={thread.threadId}
                  >
                    <span className="min-w-0 flex-1 truncate">{thread.title}</span>
                    <span className="shrink-0 text-[11px] font-normal text-muted-foreground">
                      {formatUpdatedAt(thread.updatedAt)}
                    </span>
                  </Button>
                )}
                {!confirming && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="删除对话"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingId(thread.threadId);
                    }}
                  >
                    <Trash2Icon className="size-3.5 text-muted-foreground hover:text-destructive" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
