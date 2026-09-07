import { useEffect, useState } from "react";
import { BrainCircuitIcon, ChevronRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Spinner } from "@/components/ui/spinner";
import { Markdown } from "@/components/Markdown";
import { cn } from "@/lib/utils";
import { useAutoScroll } from "@/lib/use-auto-scroll";

export function ReasoningBlock({
  reasoning,
  streaming,
}: {
  reasoning: string;
  streaming: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState(false);
  const { containerRef, onScroll } = useAutoScroll(live && open);

  // Stay expanded while reasoning changes, then collapse as soon as reasoning is complete.
  useEffect(() => {
    if (!streaming) {
      setLive(false);
      setOpen(false);
      return;
    }
    setLive(true);
    setOpen(true);
    const timer = setTimeout(() => {
      setLive(false);
      setOpen(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [streaming, reasoning]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="max-w-full">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm">
          <ChevronRightIcon
            data-icon="inline-start"
            className={cn("transition-transform", open && "rotate-90")}
          />
          <BrainCircuitIcon data-icon="inline-start" />
          Reasoning
          {live ? (
            <Badge variant="warning">
              <Spinner data-icon="inline-start" />
              live
            </Badge>
          ) : (
            <Badge variant="outline">{reasoning.length} characters</Badge>
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <Bubble variant="muted">
          <BubbleContent>
            <Markdown
              content={reasoning}
              className="max-h-80 overflow-y-auto text-sm text-muted-foreground"
              ref={containerRef}
              onScroll={onScroll}
            />
          </BubbleContent>
        </Bubble>
      </CollapsibleContent>
    </Collapsible>
  );
}
