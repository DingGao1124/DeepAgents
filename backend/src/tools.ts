import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  SKILLS_DIR,
  publishPreview,
  threadIdFromConfig,
  validateEvaPageFile,
} from "./workspace.js";

interface ComponentMeta {
  schemaVersion?: number;
  componentDir?: string;
  label?: string;
  description?: string;
  platform?: string;
  modes?: Array<{ id?: string; label?: string }>;
  dataFields?: Array<{
    key?: string;
    label?: string;
    type?: string;
    required?: boolean;
    requiredForModes?: string[];
    kind?: string;
  }>;
}

export const listEvaComponents = tool(
  async () => {
    const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
    const components: ComponentMeta[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const source = await readFile(
          path.join(SKILLS_DIR, entry.name, "references", "meta.json"),
          "utf8",
        );
        const meta = JSON.parse(source) as ComponentMeta;
        if (meta.schemaVersion === 2 && meta.componentDir && Array.isArray(meta.modes)) {
          components.push({
            schemaVersion: meta.schemaVersion,
            componentDir: meta.componentDir,
            label: meta.label,
            description: meta.description,
            platform: meta.platform,
            modes: meta.modes.map(({ id, label }) => ({ id, label })),
            dataFields: (meta.dataFields || []).map(
              ({ key, label, type, required, requiredForModes, kind }) => ({
                key,
                label,
                type,
                required,
                requiredForModes,
                kind,
              }),
            ),
          });
        }
      } catch {
        // Workflow skills intentionally have no component meta.json.
      }
    }

    components.sort((a, b) => (a.componentDir || "").localeCompare(b.componentDir || ""));
    return JSON.stringify({ ok: true, count: components.length, components }, null, 2);
  },
  {
    name: "list_eva_components",
    description:
      "列出当前可用的 Eva 业务组件、模式和业务必填字段。选择组件或判断缺失参数时先调用。",
    schema: z.object({}),
  },
);

export const validateEvaPage = tool(
  async ({ path: virtualPath }, config) => {
    const threadId = threadIdFromConfig(config);
    return JSON.stringify(await validateEvaPageFile(virtualPath, threadId), null, 2);
  },
  {
    name: "validate_eva_page",
    description:
      "对工作区中的活动页 HTML 做确定性校验。仅接受 /drafts 或 /artifacts 下的 .html 文件；失败时返回可修复的问题列表。",
    schema: z.object({
      path: z.string().describe("待校验页面，例如 /drafts/summer-campaign.html"),
    }),
  },
);

export const createPreview = tool(
  async ({ path: virtualPath, targetPage }, config) => {
    const threadId = threadIdFromConfig(config);
    const validation = await validateEvaPageFile(virtualPath, threadId);
    if (!validation.ok) {
      return JSON.stringify(
        {
          ...validation,
          ok: false,
          stage: "validation",
          message: "页面校验未通过，未生成预览。请修复 errors 后重新调用。",
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
        targetPage,
        previewUrl: published.previewUrl,
        message: "预览已发布。只向用户返回此工具给出的 previewUrl。",
      },
      null,
      2,
    );
  },
  {
    name: "create_preview",
    description:
      "校验并发布活动页预览，返回真实可访问的 previewUrl。只能在页面构建完成后调用，禁止自行拼接预览链接。",
    schema: z.object({
      path: z.string().describe("已完成的 /drafts 或 /artifacts 下的 .html 文件"),
      targetPage: z.string().min(1).describe("目标页面或投放场景的自然语言名称"),
    }),
  },
);

export const pageTools = [listEvaComponents, validateEvaPage, createPreview];
