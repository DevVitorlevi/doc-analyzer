export type AiAnalysisErrorCode = "AI_TIMEOUT" | "AI_RATE_LIMIT" | "AI_ERROR";

export class AiAnalysisError extends Error {
  readonly code: AiAnalysisErrorCode;

  constructor(code: AiAnalysisErrorCode, cause?: unknown) {
    super(`AI analysis failed: ${code}`, { cause });
    this.name = "AiAnalysisError";
    this.code = code;
  }
}
