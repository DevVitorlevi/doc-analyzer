import type {
  AnalyzeDocumentInput,
  DocumentAnalyzer,
} from "@/integrations/openai/openai-analyzer";

const DEFAULT_RESPONSE = "Análise de teste.";

export function createFakeDocumentAnalyzer() {
  const calls: AnalyzeDocumentInput[] = [];
  const state: { response: string; error: unknown } = {
    response: DEFAULT_RESPONSE,
    error: undefined,
  };

  const analyzer: DocumentAnalyzer = {
    async analyze(input) {
      calls.push(input);

      if (state.error !== undefined) {
        throw state.error;
      }

      return state.response;
    },
  };

  return {
    analyzer,
    calls,
    defaultResponse: DEFAULT_RESPONSE,
    failWith(error: unknown): void {
      state.error = error;
    },
    reset(): void {
      calls.length = 0;
      state.error = undefined;
      state.response = DEFAULT_RESPONSE;
    },
  };
}
