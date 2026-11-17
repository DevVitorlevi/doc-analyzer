import type { AiAnalysisErrorCode } from "@/integrations/openai/ai-analysis-error";
import { AiAnalysisError } from "@/integrations/openai/ai-analysis-error";
import { UnreadableFileError } from "@/integrations/text-extraction/unreadable-file-error";

export interface ProcessingFailure {
  errorCode: string;
  errorMessage: string;
}

const AI_MESSAGES: Record<AiAnalysisErrorCode, string> = {
  AI_TIMEOUT: "A análise demorou mais do que o esperado. Tente novamente.",
  AI_RATE_LIMIT:
    "O limite de uso da IA foi atingido. Tente novamente mais tarde.",
  AI_ERROR: "Não foi possível concluir a análise. Tente novamente.",
};

export function isExpectedProcessingError(error: unknown): boolean {
  return (
    error instanceof UnreadableFileError || error instanceof AiAnalysisError
  );
}

export function toProcessingFailure(error: unknown): ProcessingFailure {
  if (error instanceof UnreadableFileError) {
    return {
      errorCode: "UNREADABLE_FILE",
      errorMessage: "Não foi possível extrair texto legível do arquivo.",
    };
  }

  if (error instanceof AiAnalysisError) {
    return {
      errorCode: error.code,
      errorMessage: AI_MESSAGES[error.code],
    };
  }

  return {
    errorCode: "INTERNAL_ERROR",
    errorMessage: "Erro inesperado ao processar o documento.",
  };
}
