import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdirSync } from "node:fs";
import { mkdir, readFile, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { promisify } from "node:util";
import { getConfig } from "@langchain/langgraph";
import {
  FilesystemBackend,
  type BackendProtocolV2,
  type DeleteResult,
  type EditResult,
  type FileDownloadResponse,
  type FileUploadResponse,
  type GlobResult,
  type GrepResult,
  type LsResult,
  type ReadRawResult,
  type ReadResult,
  type WriteResult,
} from "deepagents";

const execFileAsync = promisify(execFile);
const SOURCE_DIR = path.dirname(fileURLToPath(import.meta.url));

export const BACKEND_ROOT = path.resolve(SOURCE_DIR, "..");
export const WORKSPACE_ROOT = path.resolve(
  process.env.AGENT_WORKSPACE_ROOT || path.join(BACKEND_ROOT, "workspace"),
);
export const SKILLS_DIR = path.join(WORKSPACE_ROOT, "skills");
export const SANDBOX_DIR = path.join(WORKSPACE_ROOT, "sandbox");
export const THREADS_DIR = path.join(SANDBOX_DIR, "threads");
export const PREVIEW_DIR = path.join(WORKSPACE_ROOT, "previews");

export const SANDBOX_FOLDERS = ["drafts", "artifacts", "uploads", "large_tool_results"] as const;

export async function ensureWorkspace(): Promise<void> {
  await Promise.all([
    mkdir(SKILLS_DIR, { recursive: true }),
    mkdir(THREADS_DIR, { recursive: true }),
    mkdir(PREVIEW_DIR, { recursive: true }),
  ]);
}

function safeSegment(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (/^[A-Za-z0-9_-]{1,128}$/.test(trimmed)) return trimmed;
  if (!trimmed) return fallback;
  return `${fallback}-${createHash("sha256").update(trimmed).digest("hex").slice(0, 16)}`;
}

export function threadIdFromConfig(config?: {
  configurable?: Record<string, unknown>;
}): string {
  const value = config?.configurable?.thread_id;
  return safeSegment(typeof value === "string" ? value : "", "local");
}

export function currentThreadId(): string {
  try {
    return threadIdFromConfig(getConfig());
  } catch {
    return "local";
  }
}

export function getThreadSandboxDir(threadId: string): string {
  const root = path.join(THREADS_DIR, safeSegment(threadId, "local"));
  for (const folder of SANDBOX_FOLDERS) {
    mkdirSync(path.join(root, folder), { recursive: true });
  }
  return root;
}

/**
 * Dynamically delegates every filesystem operation to a virtual-mode
 * FilesystemBackend rooted at the active LangGraph thread directory.
 */
export class ThreadFilesystemBackend implements BackendProtocolV2 {
  private get backend(): FilesystemBackend {
    return new FilesystemBackend({
      rootDir: getThreadSandboxDir(currentThreadId()),
      virtualMode: true,
      maxFileSizeMb: 5,
    });
  }

  ls(dirPath: string): Promise<LsResult> {
    return this.backend.ls(dirPath);
  }

  read(filePath: string, offset?: number, limit?: number): Promise<ReadResult> {
    return this.backend.read(filePath, offset, limit);
  }

  readRaw(filePath: string): Promise<ReadRawResult> {
    return this.backend.readRaw(filePath);
  }

  write(filePath: string, content: string): Promise<WriteResult> {
    return this.backend.write(filePath, content);
  }

  edit(
    filePath: string,
    oldString: string,
    newString: string,
    replaceAll?: boolean,
  ): Promise<EditResult> {
    return this.backend.edit(filePath, oldString, newString, replaceAll);
  }

  delete(filePath: string): Promise<DeleteResult> {
    return this.backend.delete(filePath);
  }

  grep(
    pattern: string,
    dirPath?: string,
    glob?: string | null,
    maxCount?: number | null,
  ): Promise<GrepResult> {
    return this.backend.grep(pattern, dirPath, glob, maxCount);
  }

  glob(pattern: string, searchPath?: string): Promise<GlobResult> {
    return this.backend.glob(pattern, searchPath);
  }

  uploadFiles(files: Array<[string, Uint8Array]>): Promise<FileUploadResponse[]> {
    return this.backend.uploadFiles(files);
  }

  downloadFiles(paths: string[]): Promise<FileDownloadResponse[]> {
    return this.backend.downloadFiles(paths);
  }
}

export function resolveSandboxFile(
  virtualPath: string,
  threadId = "local",
  allowedRoots: readonly string[] = ["drafts", "artifacts", "uploads"],
): string {
  if (!virtualPath.startsWith("/") || virtualPath.includes("\\") || virtualPath.includes("\0")) {
    throw new Error("The file path must be a POSIX absolute path inside the workspace, such as /drafts/page.html.");
  }

  const normalized = path.posix.normalize(virtualPath);
  const root = normalized.split("/")[1] || "";
  if (!allowedRoots.includes(root)) {
    throw new Error(`Access is limited to: ${allowedRoots.map((item) => `/${item}/`).join(", ")}`);
  }
  if (path.posix.extname(normalized).toLowerCase() !== ".html") {
    throw new Error("Page files must use the .html extension.");
  }

  const threadRoot = getThreadSandboxDir(threadId);
  const resolved = path.resolve(threadRoot, `.${normalized}`);
  const relative = path.relative(threadRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("The file path escapes the workspace boundary.");
  }
  return resolved;
}

export interface ValidationResult {
  ok: boolean;
  path: string;
  errors: string[];
  message: string;
}

export async function validateHtmlPageFile(
  virtualPath: string,
  threadId = "local",
): Promise<ValidationResult> {
  await ensureWorkspace();
  const absolutePath = resolveSandboxFile(virtualPath, threadId, ["drafts", "artifacts"]);
  const validator = path.join(
    SKILLS_DIR,
    "html-quality",
    "scripts",
    "validate-html.mjs",
  );

  try {
    await readFile(absolutePath, "utf8");
    const { stdout } = await execFileAsync(process.execPath, [validator, absolutePath], {
      cwd: SANDBOX_DIR,
      timeout: 10_000,
      maxBuffer: 512 * 1024,
    });
    return {
      ok: true,
      path: virtualPath,
      errors: [],
      message: stdout.trim() || "Page validation passed.",
    };
  } catch (error) {
    const details = error as NodeJS.ErrnoException & { stderr?: string; stdout?: string };
    const output = [details.stderr, details.stdout, details.message]
      .filter((item): item is string => Boolean(item?.trim()))
      .join("\n")
      .trim();
    const errors = output
      .split("\n")
      .map((line) => line.replace(/^[-\s]+/, "").trim())
      .filter(Boolean)
      .slice(0, 30);
    return {
      ok: false,
      path: virtualPath,
      errors,
      message: errors[0] || "Page validation failed.",
    };
  }
}

export async function publishPreview(
  virtualPath: string,
  threadId: string,
): Promise<{ fileName: string; absolutePath: string; previewUrl: string }> {
  await ensureWorkspace();
  const source = resolveSandboxFile(virtualPath, threadId, ["drafts", "artifacts"]);
  const parsed = path.parse(source);
  const slug = safeSegment(parsed.name, "web-page").slice(0, 80);
  const fileName = `${slug}-${randomUUID().slice(0, 8)}.html`;
  const safeThread = safeSegment(threadId, "local");
  const threadFolder = path.join(PREVIEW_DIR, safeThread);
  const destination = path.join(threadFolder, fileName);
  await mkdir(threadFolder, { recursive: true });
  await copyFile(source, destination);

  const publicBase = (process.env.AGENT_PUBLIC_URL || "http://localhost:2024").replace(/\/$/, "");
  return {
    fileName,
    absolutePath: destination,
    previewUrl: `${publicBase}/api/previews/${encodeURIComponent(safeThread)}/${encodeURIComponent(fileName)}`,
  };
}

export function resolvePublishedPreview(threadId: string, fileName: string): string {
  const safeThread = safeSegment(threadId, "local");
  if (safeThread !== threadId || !/^[A-Za-z0-9_-]{1,96}\.html$/.test(fileName)) {
    throw new Error("The preview path is invalid.");
  }
  const resolved = path.resolve(PREVIEW_DIR, safeThread, fileName);
  const relative = path.relative(PREVIEW_DIR, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("The preview path escapes the publication directory.");
  }
  return resolved;
}
