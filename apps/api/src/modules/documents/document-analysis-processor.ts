import type { DocumentAnalyzer } from "@/integrations/openai/openai-analyzer";
import {
  extractText,
  type DocumentFormat,
} from "@/integrations/text-extraction/text-extractor";
import {
  isExpectedProcessingError,
  toProcessingFailure,
  type ProcessingFailure,
} from "./processing-failure";

export type AnalysisOutcome =
  | { ok: true; analysis: string; truncated: boolean }
  | { ok: false; failure: ProcessingFailure; truncated: boolean };

export async function processDocumentAnalysis(
  deps: {
    analyzer: DocumentAnalyzer;
    maxTextChars: number;
    logger: { error: (obj: object, message: string) => void };
  },
  input: {
    instruction: string;
    buffer: Buffer;
    format: DocumentFormat;
  },
): Promise<AnalysisOutcome> {
  let truncated = false;

  try {
    const extracted = await extractText(
      input.buffer,
      input.format,
      deps.maxTextChars,
    );

    truncated = extracted.truncated;

    const analysis = await deps.analyzer.analyze({
      instruction: input.instruction,
      text: extracted.text,
      truncated,
    });

    return { ok: true, analysis, truncated };
  } catch (error) {
    if (!isExpectedProcessingError(error)) {
      deps.logger.error(
        { err: error },
        "Unexpected error while processing document",
      );
    }

    return {
      ok: false,
      failure: toProcessingFailure(error),
      truncated,
    };
  }
}
