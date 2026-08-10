import type { ComponentProps } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const components: Components = {
  h1: ({ className, ...props }) => (
    <h1 className={cn("mt-5 scroll-m-20 text-2xl font-semibold tracking-tight first:mt-0", className)} {...props} />
  ),
  h2: ({ className, ...props }) => (
    <h2 className={cn("mt-5 scroll-m-20 text-xl font-semibold tracking-tight first:mt-0", className)} {...props} />
  ),
  h3: ({ className, ...props }) => (
    <h3 className={cn("mt-4 scroll-m-20 text-base font-semibold first:mt-0", className)} {...props} />
  ),
  p: ({ className, ...props }) => <p className={cn("leading-7", className)} {...props} />,
  ul: ({ className, ...props }) => (
    <ul className={cn("ml-5 list-disc space-y-1", className)} {...props} />
  ),
  ol: ({ className, ...props }) => (
    <ol className={cn("ml-5 list-decimal space-y-1", className)} {...props} />
  ),
  li: ({ className, ...props }) => <li className={cn("pl-1 leading-7", className)} {...props} />,
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn("border-l-2 border-border pl-4 italic text-muted-foreground", className)}
      {...props}
    />
  ),
  a: ({ className, ...props }) => (
    <a
      className={cn("font-medium text-primary underline underline-offset-4", className)}
      target="_blank"
      rel="noreferrer noopener"
      {...props}
    />
  ),
  code: ({ className, ...props }) => (
    <code
      className={cn("rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]", className)}
      {...props}
    />
  ),
  pre: ({ className, ...props }) => (
    <pre
      className={cn(
        "max-w-full overflow-x-auto rounded-xl border bg-muted/60 p-4 text-xs leading-6 [&>code]:bg-transparent [&>code]:p-0",
        className,
      )}
      {...props}
    />
  ),
  table: ({ className, ...props }) => (
    <div className="max-w-full overflow-x-auto rounded-lg border">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  ),
  thead: ({ className, ...props }) => <thead className={cn("bg-muted/60", className)} {...props} />,
  th: ({ className, ...props }) => (
    <th className={cn("border-b px-3 py-2 text-left font-medium", className)} {...props} />
  ),
  td: ({ className, ...props }) => (
    <td className={cn("border-b px-3 py-2 align-top last:border-r-0", className)} {...props} />
  ),
  hr: ({ className, ...props }) => <hr className={cn("my-4 border-border", className)} {...props} />,
};

export function Markdown({ content, className, ...props }: ComponentProps<"div"> & { content: string }) {
  return (
    <div className={cn("min-w-0 space-y-3 text-[15px] leading-7", className)} {...props}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
        {content}
      </ReactMarkdown>
    </div>
  );
}
