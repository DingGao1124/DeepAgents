import { useState } from "react";
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

export function ReasoningBlock({
  reasoning,
  streaming,
}: {
  reasoning: string;
  streaming: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="max-w-full">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm">
          <ChevronRightIcon
            data-icon="inline-start"
            className={cn("transition-transform", open && "rotate-90")}
          />
          <BrainCircuitIcon data-icon="inline-start" />
          思考过程
          {streaming ? (
            <Badge variant="warning">
              <Spinner data-icon="inline-start" />
              live
            </Badge>
          ) : (
            <Badge variant="outline">{reasoning.length} 字符</Badge>
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <Bubble variant="muted">
          <BubbleContent>
            <Markdown
              content={reasoning}
              className="max-h-80 overflow-y-auto text-sm text-muted-foreground"
            />
          </BubbleContent>
        </Bubble>
      </CollapsibleContent>
    </Collapsible>
  );
}
