import { useCallback, useEffect, useState } from "react";
import { AlertCircleIcon, MessageCircleIcon, RefreshCwIcon } from "lucide-react";
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
  const firstHuman = messages.find(
    (message) => message?.type === "human" || message?.role === "user",
  );
  const content = firstHuman?.content;
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
  refreshSignal,
}: {
  activeThreadId: string | null;
  onSelect: (threadId: string) => void;
  refreshSignal: number;
}) {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await client.threads.search({
        limit: 50,
        sortBy: "updated_at",
        sortOrder: "desc",
      });
      setThreads(
        results.map((thread) => ({
          threadId: thread.thread_id,
          title: deriveTitle(thread.values),
          updatedAt: thread.updated_at,
        })),
      );
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
            return (
              <li key={thread.threadId}>
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
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
