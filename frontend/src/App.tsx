import { useState } from "react";
import { useStream, type SubagentDiscoverySnapshot } from "@langchain/react";
import { AIMessage, HumanMessage } from "langchain";
import {
  AlertCircleIcon,
  ArrowUpIcon,
  BotIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  CircleIcon,
  Clock3Icon,
  FolderIcon,
  GitPullRequestIcon,
  ListChecksIcon,
  MoreHorizontalIcon,
  PanelLeftIcon,
  PlusIcon,
  RefreshCwIcon,
  SparklesIcon,
} from "lucide-react";
import {
  AGENT_URL,
  ASSISTANT_ID,
  THREAD_KEY,
  client,
  type HITLRequest,
  type Decision,
} from "./config";
import { ApprovalCard } from "./components/ApprovalCard";
import { ConversationList } from "./components/ConversationList";
import { MessageContentRenderer } from "./components/MessageContentRenderer";
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Message, MessageContent } from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { messageText, toDisplayText } from "@/lib/message-content";

type Todo = { content: string; status: string };

function conversationTitle(messages: unknown[]): string {
  const firstHuman = messages.find((message) => HumanMessage.isInstance(message));
  const title = messageText(firstHuman).trim().replace(/\s+/g, " ");
  return title ? title.slice(0, 44) : "New conversation";
}

export function App() {
  const [sessionKey, setSessionKey] = useState(0);
  const [threadId, setThreadId] = useState<string | null>(() =>
    sessionStorage.getItem(THREAD_KEY),
  );
  const [conversationRefresh, setConversationRefresh] = useState(0);

  const openThread = (id: string) => {
    if (id === threadId) return;
    sessionStorage.setItem(THREAD_KEY, id);
    setThreadId(id);
    setSessionKey((key) => key + 1);
  };

  const newThread = () => {
    sessionStorage.removeItem(THREAD_KEY);
    setThreadId(null);
    setSessionKey((key) => key + 1);
  };

  return (
    <TooltipProvider>
      <AgentWorkspace
        key={sessionKey}
        threadId={threadId}
        conversationRefresh={conversationRefresh}
        onThreadId={(id) => {
          setThreadId(id);
          if (id) sessionStorage.setItem(THREAD_KEY, id);
        }}
        onConversationRefresh={() => setConversationRefresh((value) => value + 1)}
        onOpenThread={openThread}
        onNewThread={newThread}
        onReconnect={() => setSessionKey((key) => key + 1)}
      />
    </TooltipProvider>
  );
}

function AgentWorkspace({
  threadId,
  conversationRefresh,
  onThreadId,
  onConversationRefresh,
  onOpenThread,
  onNewThread,
  onReconnect,
}: {
  threadId: string | null;
  conversationRefresh: number;
  onThreadId: (id: string) => void;
  onConversationRefresh: () => void;
  onOpenThread: (id: string) => void;
  onNewThread: () => void;
  onReconnect: () => void;
}) {
  const [input, setInput] = useState("");
  const stream = useStream({
    apiUrl: AGENT_URL,
    assistantId: ASSISTANT_ID,
    threadId,
    onThreadId(id) {
      if (id) {
        onThreadId(id);
        onConversationRefresh();
      }
    },
  });

  const subagents = [...stream.subagents.values()];
  const subagentsByCallId = new Map(subagents.map((subagent) => [subagent.id, subagent]));
  const todos = ((stream.values as { todos?: Todo[] } | undefined)?.todos ?? []) as Todo[];
  const interrupts = stream.interrupts;
  const interruptRequest = (interrupts[0]?.value ?? stream.interrupt?.value) as HITLRequest | undefined;
  const hasInterrupt = interrupts.length > 0;
  const streamError = stream.error ? String((stream.error as { message?: string })?.message ?? stream.error) : null;
  const title = conversationTitle(stream.messages);

  const send = () => {
    const text = input.trim();
    if (!text || stream.isLoading || hasInterrupt) return;
    setInput("");
    void stream
      .submit(
        { messages: [{ type: "human", content: text }] },
        { config: { recursion_limit: 100 } },
      )
      .finally(onConversationRefresh);
  };

  const reconnect = async () => {
    await stream.disconnect();
    onReconnect();
  };

  const handleDeleteThread = async (id: string) => {
    try {
      await client.threads.delete(id);
    } catch {
      // ignore delete errors
    }
    if (id === threadId) {
      onNewThread();
    }
    onConversationRefresh();
  };

  const resume = (decisions: Decision[]) => stream.respond({ decisions });

  return (
    <div className="grid h-dvh grid-cols-[280px_minmax(0,1fr)_330px] overflow-hidden bg-background max-xl:grid-cols-[260px_minmax(0,1fr)] max-md:grid-cols-1">
      <aside className="flex min-h-0 flex-col bg-sidebar text-sidebar-foreground max-md:hidden">
        <div className="flex h-14 shrink-0 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-foreground text-background">
              <SparklesIcon className="size-4" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Web Page Automation Agent</span>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Collapse sidebar" disabled>
            <PanelLeftIcon />
          </Button>
        </div>

        <nav className="flex shrink-0 flex-col gap-1 px-3 pb-3" aria-label="Main navigation">
          <Button variant="ghost" className="w-full justify-start" onClick={onNewThread}>
            <PlusIcon data-icon="inline-start" />
            New conversation
          </Button>
          <Button variant="ghost" className="w-full justify-start" disabled>
            <GitPullRequestIcon data-icon="inline-start" />
            Runs
          </Button>
          <Button variant="ghost" className="w-full justify-start" disabled>
            <Clock3Icon data-icon="inline-start" />
            Scheduled
          </Button>
        </nav>

        <Separator />
        <div className="flex min-h-0 flex-1 flex-col px-3 pt-4">
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="text-xs font-medium text-muted-foreground">Conversations</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="New conversation"
                  onClick={onNewThread}
                >
                  <PlusIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New conversation</TooltipContent>
            </Tooltip>
          </div>
          <ConversationList
            activeThreadId={threadId}
            onSelect={onOpenThread}
            onDelete={handleDeleteThread}
            refreshSignal={conversationRefresh}
          />
        </div>

        <div className="flex shrink-0 items-center gap-3 border-t px-4 py-3">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            WP
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">Web Page Automation Agent</p>
            <p className="truncate text-xs text-muted-foreground">sandboxed workspace</p>
          </div>
        </div>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-col border-x bg-background max-md:border-0">
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
            <h1 className="truncate text-sm font-semibold">{title}</h1>
            <Button variant="ghost" size="icon-xs" aria-label="More actions" disabled>
              <MoreHorizontalIcon />
            </Button>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={hasInterrupt || stream.isLoading ? "warning" : "outline"}>
              {hasInterrupt ? (
                <AlertCircleIcon data-icon="inline-start" />
              ) : stream.isLoading ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
              )}
              {hasInterrupt ? "Awaiting approval" : stream.isLoading ? "Running" : "Ready"}
            </Badge>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Reconnect"
                  disabled={!threadId}
                  onClick={() => void reconnect()}
                >
                  <RefreshCwIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reconnect current thread</TooltipContent>
            </Tooltip>
          </div>
        </header>

        <section className="flex min-h-0 flex-1 flex-col">
          <MessageScrollerProvider autoScroll>
            <MessageScroller>
              <MessageScrollerViewport>
                <MessageScrollerContent className="mx-auto w-full max-w-3xl px-6 py-10">
                  {stream.messages.length === 0 && (
                    <MessageScrollerItem messageId="empty-state">
                      <Empty className="min-h-[48vh]">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <BotIcon />
                          </EmptyMedia>
                          <EmptyTitle>Turn a visual concept into a working web page</EmptyTitle>
                          <EmptyDescription>
                            Provide a key visual and wireframe. I can plan the design, implement the
                            responsive HTML, validate it, and publish an isolated preview.
                          </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                          {[
                            "Create a responsive landing page from these key visual and wireframe URLs",
                            "Develop a visual direction for this wireframe using my reference artwork",
                            "Convert this approved design into HTML and publish a preview",
                          ].map((suggestion) => (
                            <Button
                              key={suggestion}
                              variant="outline"
                              className="w-full justify-start"
                              onClick={() => setInput(suggestion)}
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </EmptyContent>
                      </Empty>
                    </MessageScrollerItem>
                  )}

                  {stream.messages.map((message, index) => {
                    const isHuman = HumanMessage.isInstance(message);
                    const isAI = AIMessage.isInstance(message);
                    if (!isHuman && !isAI) return null;

                    // Hide summary messages injected by summarizationMiddleware so they do not appear first.
                    const extra = (message.additional_kwargs ?? {}) as Record<string, unknown>;
                    if (extra.lc_source === "summarization") return null;

                    const isLast = index === stream.messages.length - 1;
                    const streaming = isAI && isLast && stream.isLoading;

                    return (
                      <MessageScrollerItem
                        key={message.id ?? index}
                        messageId={message.id ?? `message-${index}`}
                        scrollAnchor={isHuman}
                      >
                        <Message align={isHuman ? "end" : "start"}>
                          <MessageContent>
                            <MessageContentRenderer
                              message={message}
                              role={isHuman ? "human" : "ai"}
                              streaming={streaming}
                              stream={stream}
                              subagentsByCallId={subagentsByCallId}
                            />
                          </MessageContent>
                        </Message>
                      </MessageScrollerItem>
                    );
                  })}

                  {stream.isLoading && !hasInterrupt && !streamError && (
                    <MessageScrollerItem messageId="working" scrollAnchor>
                      <Message>
                        <MessageContent>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Spinner />
                            <span className="shimmer">Working…</span>
                          </div>
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  )}

                  {streamError && !hasInterrupt && (
                    <MessageScrollerItem messageId="error" scrollAnchor>
                      <Message>
                        <MessageContent>
                          <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                            <AlertCircleIcon className="size-4 shrink-0" />
                            <span>{streamError}</span>
                          </div>
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  )}

                  {interruptRequest && (
                    <MessageScrollerItem messageId="approval" scrollAnchor>
                      <ApprovalCard
                        request={interruptRequest}
                        disabled={stream.isLoading}
                        onResume={resume}
                      />
                    </MessageScrollerItem>
                  )}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>

          <div className="shrink-0 px-6 pb-5 pt-2">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 rounded-2xl border bg-card p-3 shadow-[0_10px_35px_oklch(0.18_0.006_285.89/0.08)]">
              <Textarea
                variant="composer"
                value={input}
                rows={2}
                placeholder={
                  hasInterrupt ? "Review the approval request above first…" : "Enter a task or question…"
                }
                disabled={stream.isLoading || hasInterrupt}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    send();
                  }
                }}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon-sm" aria-label="Add attachment" disabled>
                    <PlusIcon />
                  </Button>
                  <Badge variant="outline">Workspace access</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">DeepSeek</span>
                  <Button
                    size="icon"
                    className="rounded-full"
                    aria-label="Send message"
                    disabled={stream.isLoading || hasInterrupt || !input.trim()}
                    onClick={send}
                  >
                    <ArrowUpIcon />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <aside className="min-h-0 bg-background max-xl:hidden">
        <ActivityPanel
          todos={todos}
          subagents={subagents}
          threadId={threadId}
          loading={stream.isLoading}
        />
      </aside>
    </div>
  );
}

function ActivityPanel({
  todos,
  subagents,
  threadId,
  loading,
}: {
  todos: Todo[];
  subagents: SubagentDiscoverySnapshot[];
  threadId: string | null;
  loading: boolean;
}) {
  return (
    <Card size="sm" className="m-4 max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-sm">
      <CardHeader>
        <CardTitle>Run status</CardTitle>
        <CardDescription>{threadId ? `Thread ${threadId.slice(0, 8)}` : "No thread yet"}</CardDescription>
        <CardAction>
          <Badge variant={loading ? "warning" : "secondary"}>
            {loading ? "Working" : "Idle"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ListChecksIcon className="size-4 text-muted-foreground" />
            Plan
            {todos.length > 0 && <Badge variant="outline">{todos.length}</Badge>}
          </div>
          {todos.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {todos.map((todo, index) => {
                const completed = todo.status === "completed";
                const active = todo.status === "in_progress";
                const Icon = completed
                  ? CheckCircle2Icon
                  : active
                    ? CircleDashedIcon
                    : CircleIcon;
                return (
                  <li
                    key={`${toDisplayText(todo.content)}-${index}`}
                    className="flex items-start gap-2 text-sm"
                  >
                    <Icon
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        completed && "text-success",
                        active && "animate-spin text-warning",
                        !completed && !active && "text-muted-foreground",
                      )}
                    />
                    <span className={cn(completed && "text-muted-foreground line-through")}>
                      {toDisplayText(todo.content)}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">The agent's plan will appear here.</p>
          )}
        </section>

        <Separator />

        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BotIcon className="size-4 text-muted-foreground" />
            Subagents
            {subagents.length > 0 && <Badge variant="outline">{subagents.length}</Badge>}
          </div>
          {subagents.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {subagents.map((subagent) => (
                <li key={subagent.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate capitalize">{subagent.name}</span>
                  <Badge
                    variant={
                      subagent.status === "complete"
                        ? "success"
                        : subagent.status === "error"
                          ? "destructive"
                          : subagent.status === "running"
                            ? "warning"
                            : "secondary"
                    }
                  >
                    {subagent.status}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No subagents have been started.</p>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
