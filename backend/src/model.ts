import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatOpenAI } from "@langchain/openai";

export enum ModelName {
  FLASH = "deepseek-v4-flash",
  PRO = "deepseek-v4-pro",
}

export function createDeepSeek(model: ModelName = ModelName.FLASH) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error(
      "DEEPSEEK_API_KEY is required. Copy backend/.env.example to backend/.env and set it there.",
    );
  }

  return new ChatDeepSeek({
    model,
    apiKey,
    reasoning: {
      effort: "medium",
    },
  });
}
