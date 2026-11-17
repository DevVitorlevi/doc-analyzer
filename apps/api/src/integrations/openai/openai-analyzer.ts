import OpenAI from "openai";
import type { Env } from "@/config/env";
import { AiAnalysisError } from "./ai-analysis-error";
import {
  buildUserMessage,
  SYSTEM_PROMPT,
  type AnalysisPromptInput,
} from "./analysis-prompt";

export const MAX_COMPLETION_TOKENS = 1500;
export const ANALYSIS_TEMPERATURE = 0.2;

export type AnalyzeDocumentInput = AnalysisPromptInput;

export interface DocumentAnalyzer {
  analyze(input: AnalyzeDocumentInput): Promise<string>;
}

type OpenAISettings = Pick<
  Env,
  "OPENAI_API_KEY" | "OPENAI_MODEL" | "OPENAI_TIMEOUT_MS"
>;

export function createOpenAIClient(env: OpenAISettings): OpenAI {
  return new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    timeout: env.OPENAI_TIMEOUT_MS,
    maxRetries: 0,
  });
}

function toAiAnalysisError(error: unknown): AiAnalysisError {
  if (error instanceof AiAnalysisError) {
    return error;
  }

  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return new AiAnalysisError("AI_TIMEOUT", error);
  }

  if (error instanceof OpenAI.RateLimitError) {
    return new AiAnalysisError("AI_RATE_LIMIT", error);
  }

  return new AiAnalysisError("AI_ERROR", error);
}

export function createOpenAIAnalyzer(
  env: OpenAISettings,
  client: OpenAI = createOpenAIClient(env),
): DocumentAnalyzer {
  return {
    async analyze(input: AnalyzeDocumentInput): Promise<string> {
      try {
        const completion = await client.chat.completions.create({
          model: env.OPENAI_MODEL,
          temperature: ANALYSIS_TEMPERATURE,
          max_completion_tokens: MAX_COMPLETION_TOKENS,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserMessage(input) },
          ],
        });

        const content = completion.choices[0]?.message.content?.trim();

        if (!content) {
          throw new AiAnalysisError(
            "AI_ERROR",
            new Error("OpenAI returned an empty response"),
          );
        }

        return content;
      } catch (error) {
        throw toAiAnalysisError(error);
      }
    },
  };
}
