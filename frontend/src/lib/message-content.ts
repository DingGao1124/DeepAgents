type UnknownRecord = Record<string, unknown>;

export type DisplayContentBlock =
  | { type: "text"; key: string; text: string }
  | { type: "reasoning"; key: string; reasoning: string }
  | {
      type: "tool_call";
      key: string;
      id?: string;
      name: string;
      args: unknown;
      error?: string;
    }
  | {
      type: "tool_result";
      key: string;
      id?: string;
      name?: string;
      status: "success" | "error" | "unknown";
      output: unknown;
    }
  | {
      type: "media";
      key: string;
      mediaType: "image" | "video" | "audio" | "file";
      url?: string;
      fileId?: string;
      mimeType?: string;
      title?: string;
    }
  | { type: "unknown"; key: string; blockType: string; data: unknown };

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

function callId(record: UnknownRecord): string | undefined {
  return (
    stringValue(record.id) ??
    stringValue(record.callId) ??
    stringValue(record.tool_call_id) ??
    stringValue(record.toolCallId)
  );
}

export function safeJsonStringify(value: unknown): string {
  if (typeof value === "string") return value;

  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(
      value,
      (_key, nested) => {
        if (typeof nested !== "object" || nested === null) return nested;
        if (seen.has(nested)) return "[Circular]";
        seen.add(nested);
        return nested;
      },
      2,
    );
  } catch {
    return "[无法显示的结构化内容]";
  }
}

function mediaSource(record: UnknownRecord): UnknownRecord {
  return isRecord(record.source) ? record.source : record;
}

function parseBlock(
  value: unknown,
  key: string,
  blocks: DisplayContentBlock[],
  seen: WeakSet<object>,
): void {
  if (value == null) return;

  if (typeof value === "string") {
    if (value.trim()) blocks.push({ type: "text", key, text: value });
    return;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    blocks.push({ type: "text", key, text: String(value) });
    return;
  }

  if (typeof value !== "object" || seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((item, index) => parseBlock(item, `${key}-${index}`, blocks, seen));
    return;
  }

  const record = value as UnknownRecord;
  const blockType = stringValue(record.type) ?? "unknown";

  if (blockType === "text" || blockType === "text-plain" || blockType === "input_text") {
    const text = stringValue(record.text) ?? stringValue(record.content);
    if (text) blocks.push({ type: "text", key, text });
    return;
  }

  if (blockType === "reasoning" || blockType === "thinking") {
    const reasoning =
      stringValue(record.reasoning) ??
      stringValue(record.thinking) ??
      stringValue(record.text) ??
      stringValue(record.content);
    if (reasoning) blocks.push({ type: "reasoning", key, reasoning });
    return;
  }

  if (
    blockType === "tool_call" ||
    blockType === "tool_use" ||
    blockType === "server_tool_call" ||
    blockType === "invalid_tool_call"
  ) {
    blocks.push({
      type: "tool_call",
      key,
      id: callId(record),
      name: stringValue(record.name) ?? "unknown_tool",
      args: record.args ?? record.input ?? {},
      error: blockType === "invalid_tool_call" ? stringValue(record.error) : undefined,
    });
    return;
  }

  if (blockType === "tool_call_chunk" || blockType === "server_tool_call_chunk") {
    blocks.push({
      type: "tool_call",
      key,
      id: callId(record),
      name: stringValue(record.name) ?? "工具调用",
      args: record.args ?? record.input ?? {},
    });
    return;
  }

  if (
    blockType === "tool_result" ||
    blockType === "tool_response" ||
    blockType === "server_tool_call_result"
  ) {
    const rawStatus = stringValue(record.status);
    blocks.push({
      type: "tool_result",
      key,
      id: callId(record),
      name: stringValue(record.name),
      status: rawStatus === "success" || rawStatus === "error" ? rawStatus : "unknown",
      output: record.output ?? record.content ?? record.result,
    });
    return;
  }

  if (["image", "image_url", "video", "audio", "file"].includes(blockType)) {
    const source = mediaSource(record);
    const imageUrl = isRecord(record.image_url)
      ? stringValue(record.image_url.url)
      : stringValue(record.image_url);
    const mediaType = blockType === "image_url" ? "image" : blockType;
    blocks.push({
      type: "media",
      key,
      mediaType: mediaType as "image" | "video" | "audio" | "file",
      url: stringValue(source.url) ?? imageUrl,
      fileId: stringValue(source.fileId) ?? stringValue(source.file_id),
      mimeType: stringValue(source.mimeType) ?? stringValue(source.mime_type),
      title:
        stringValue(record.title) ?? stringValue(record.name) ?? stringValue(record.filename),
    });
    return;
  }

  // Serialized LangChain messages wrap the useful blocks in `content`.
  if ("content" in record) {
    parseBlock(record.content, `${key}-content`, blocks, seen);
    return;
  }

  blocks.push({ type: "unknown", key, blockType, data: record });
}

function toolIdentity(block: Extract<DisplayContentBlock, { type: "tool_call" }>): string {
  return block.id ?? `${block.name}:${safeJsonStringify(block.args)}`;
}

/** Parse LangChain/provider message payloads without flattening typed blocks into JSON text. */
export function parseMessageContent(message: unknown): DisplayContentBlock[] {
  const blocks: DisplayContentBlock[] = [];
  const seen = new WeakSet<object>();
  const record = isRecord(message) ? message : undefined;

  parseBlock(record && "content" in record ? record.content : message, "content", blocks, seen);

  // Some providers put tool calls beside `content`; merge and deduplicate them.
  if (record && Array.isArray(record.tool_calls)) {
    const existing = new Set(
      blocks.filter((block) => block.type === "tool_call").map(toolIdentity),
    );
    record.tool_calls.forEach((toolCall, index) => {
      const extra: DisplayContentBlock[] = [];
      parseBlock(
        isRecord(toolCall) && !toolCall.type
          ? { ...toolCall, type: "tool_call" }
          : toolCall,
        `tool-call-${index}`,
        extra,
        seen,
      );
      extra.forEach((block) => {
        if (block.type !== "tool_call") return;
        const identity = toolIdentity(block);
        if (!existing.has(identity)) {
          existing.add(identity);
          blocks.push(block);
        }
      });
    });
  }

  const extraReasoning =
    record && isRecord(record.additional_kwargs)
      ? stringValue(record.additional_kwargs.reasoning_content)
      : undefined;
  if (extraReasoning && !blocks.some((block) => block.type === "reasoning")) {
    blocks.unshift({ type: "reasoning", key: "additional-reasoning", reasoning: extraReasoning });
  }

  return blocks;
}

/** Return only user-facing prose. Reasoning and tool blocks are intentionally excluded. */
export function messageText(message: unknown): string {
  return parseMessageContent(message)
    .filter((block): block is Extract<DisplayContentBlock, { type: "text" }> => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

/** Convert miscellaneous status/output values into a React-safe string. */
export function toDisplayText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  const text = messageText(value);
  if (text) return text;

  if (isRecord(value)) {
    if ("output" in value) return toDisplayText(value.output);
    if ("message" in value) return toDisplayText(value.message);
  }

  return safeJsonStringify(value);
}
