import { loadEnv } from "../src/config/env";
import { createOpenAIAnalyzer } from "../src/integrations/openai/openai-analyzer";
import { AiAnalysisError } from "../src/integrations/openai/ai-analysis-error";

function log(message: string): void {
  process.stdout.write(`${message}\n`);
}

async function main(): Promise<void> {
  const env = loadEnv();
  const analyzer = createOpenAIAnalyzer(env);

  const analysis = await analyzer.analyze({
    instruction: "Resuma o documento em uma frase.",
    text: "Este é um documento de teste. Ele descreve um contrato de prestação de serviços entre duas empresas fictícias, com prazo de doze meses.",
    truncated: false,
  });

  if (analysis.length === 0) {
    throw new Error("Empty analysis");
  }

  log(`1/1 analysis: ok (${analysis.length} characters)`);
}

main().catch((error: unknown) => {
  const name = error instanceof Error ? error.name : "UnknownError";
  const code = error instanceof AiAnalysisError ? ` [${error.code}]` : "";
  const causeName =
    error instanceof Error && error.cause instanceof Error
      ? ` (cause: ${error.cause.name})`
      : "";
  process.stderr.write(`Smoke test failed: ${name}${code}${causeName}\n`);
  process.exit(1);
});
