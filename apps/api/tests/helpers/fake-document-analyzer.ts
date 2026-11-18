import type {
  AnalyzeDocumentInput,
  DocumentAnalyzer,
} from "@/integrations/openai/openai-analyzer";

const DEFAULT_RESPONSE = "Análise de teste.";

export function createFakeDocumentAnalyzer() {
  const calls: AnalyzeDocumentInput[] = [];

  const state: {
    response: string;
    error: unknown;
    gate?: Promise<void>;
    notifyStarted?: () => void;
  } = {
    response: DEFAULT_RESPONSE,
    error: undefined,
  };

  const analyzer: DocumentAnalyzer = {
    async analyze(input) {
      calls.push(input);

      state.notifyStarted?.();

      if (state.gate) {
        await state.gate;
      }

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

    pause(): {
      started: Promise<void>;
      release: () => void;
    } {
      let notifyStarted!: () => void;
      let release!: () => void;

      const started = new Promise<void>((resolve) => {
        notifyStarted = resolve;
      });

      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });

      state.notifyStarted = notifyStarted;
      state.gate = gate;

      return {
        started,
        release,
      };
    },

    reset(): void {
      calls.length = 0;
      state.error = undefined;
      state.response = DEFAULT_RESPONSE;
      state.gate = undefined;
      state.notifyStarted = undefined;
    },
  };
}
