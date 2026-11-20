import type { FastifyInstance } from "fastify";

import type { DocumentAnalyzer } from "@/integrations/openai/openai-analyzer";
import type { StorageProvider } from "@/integrations/storage/s3-storage";
import { createDocumentAnalysisWorker } from "@/modules/documents/document-analysis-worker";
import { createDocumentRepository } from "@/repositories/document-repository";

const TEST_MAX_TEXT_CHARS = 60_000;

export async function runAnalysisWorker(
  app: FastifyInstance,
  deps: {
    storage: StorageProvider;
    analyzer: DocumentAnalyzer;
    maxTextChars?: number;
  },
): Promise<void> {
  const worker = createDocumentAnalysisWorker({
    documents: createDocumentRepository(app.prisma),
    storage: deps.storage,
    analyzer: deps.analyzer,
    logger: app.log,
    maxTextChars: deps.maxTextChars ?? TEST_MAX_TEXT_CHARS,
  });

  await worker.processPendingAnalyses();
}
