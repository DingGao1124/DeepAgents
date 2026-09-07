import { readFile } from "node:fs/promises";
import { Hono } from "hono";
import { ensureWorkspace, resolvePublishedPreview } from "./workspace.js";

export const app = new Hono();

app.get("/api/health", (c) =>
  c.json({
    ok: true,
    service: "web-page-automation-agent",
    filesystemSandbox: true,
    shellExecution: false,
  }),
);

app.get("/api/previews/:threadId/:fileName", async (c) => {
  try {
    await ensureWorkspace();
    const filePath = resolvePublishedPreview(c.req.param("threadId"), c.req.param("fileName"));
    const html = await readFile(filePath, "utf8");
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, private",
        "Content-Security-Policy":
          "sandbox allow-scripts allow-forms allow-popups; default-src 'self' https: data: blob:; img-src https: data: blob:; media-src https: data: blob:; style-src 'unsafe-inline' https:; script-src 'unsafe-inline' https:; connect-src https:; frame-ancestors 'self' http://localhost:5173",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Preview not found.";
    return c.json({ ok: false, message }, 404);
  }
});
