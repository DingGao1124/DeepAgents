import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  publishPreview,
  threadIdFromConfig,
  validateHtmlPageFile,
} from "./workspace.js";

export const validateHtmlPage = tool(
  async ({ path: virtualPath }, config) => {
    const threadId = threadIdFromConfig(config);
    return JSON.stringify(await validateHtmlPageFile(virtualPath, threadId), null, 2);
  },
  {
    name: "validate_html_page",
    description:
      "Run deterministic quality and safety checks on a self-contained HTML page. Accepts only .html files under /drafts or /artifacts and returns actionable errors.",
    schema: z.object({
      path: z.string().describe("Page to validate, for example /drafts/product-launch.html"),
    }),
  },
);

export const createPreview = tool(
  async ({ path: virtualPath, projectName }, config) => {
    const threadId = threadIdFromConfig(config);
    const validation = await validateHtmlPageFile(virtualPath, threadId);
    if (!validation.ok) {
      return JSON.stringify(
        {
          ...validation,
          ok: false,
          stage: "validation",
          message: "HTML validation failed and no preview was created. Fix the errors and try again.",
        },
        null,
        2,
      );
    }

    const published = await publishPreview(virtualPath, threadId);
    return JSON.stringify(
      {
        ok: true,
        page: virtualPath,
        projectName,
        previewUrl: published.previewUrl,
        message: "Preview published. Return only the previewUrl produced by this tool.",
      },
      null,
      2,
    );
  },
  {
    name: "create_preview",
    description:
      "Validate and publish a browser preview for a completed HTML page. Call only after implementation is complete and never construct a preview URL manually.",
    schema: z.object({
      path: z.string().describe("Completed .html file under /drafts or /artifacts"),
      projectName: z.string().min(1).describe("Short human-readable name for the page"),
    }),
  },
);

export const webPageTools = [validateHtmlPage, createPreview];
