import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { fileURLToPath } from "node:url";
import type { Env } from "@/config/env";
import { healthRoutes } from "@/modules/health/health-routes";
import { authRoutes } from "@/modules/auth/auth-routes";
import {
  createGoogleOAuthProvider,
  type GoogleOAuthProvider,
} from "@/modules/auth/google-oauth";
import { documentsRoutes } from "@/modules/documents/documents-routes";
import { createDocumentService } from "@/modules/documents/documents-service";
import { createDocumentDeletionWorker } from "@/modules/documents/document-deletion-worker";
import { createDocumentAnalysisWorker } from "@/modules/documents/document-analysis-worker";
import {
  createOpenAIAnalyzer,
  type DocumentAnalyzer,
} from "@/integrations/openai/openai-analyzer";
import {
  createS3Storage,
  type StorageProvider,
} from "@/integrations/storage/s3-storage";
import { createDocumentRepository } from "@/repositories/document-repository";
import { registerErrorHandler } from "@/shared/errors/error-handler";
import { createPrismaClient } from "@/shared/database/prisma";
import { buildLoggerOptions } from "./shared/logger/logger";

export interface BuildAppOptions {
  googleOAuthProvider?: GoogleOAuthProvider;
  storage?: StorageProvider;
  documentAnalyzer?: DocumentAnalyzer;
}

export async function buildApp(
  env: Env,
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: buildLoggerOptions(env.NODE_ENV === "test" ? "silent" : "info"),
  });

  registerErrorHandler(app);

  const prisma = createPrismaClient(env.DATABASE_URL);
  app.decorate("prisma", prisma);
  app.decorateRequest("currentUser", null);

  let stopDocumentDeletionWorker: (() => Promise<void>) | undefined;
  let stopDocumentAnalysisWorker: (() => Promise<void>) | undefined;

  app.addHook("onClose", async () => {
    await stopDocumentAnalysisWorker?.();
    await stopDocumentDeletionWorker?.();
    await prisma.$disconnect();
  });

  const googleOAuthProvider =
    options.googleOAuthProvider ?? createGoogleOAuthProvider(env);
  app.decorate("googleOAuthProvider", googleOAuthProvider);

  const maxFileSizeBytes = Math.floor(env.MAX_FILE_SIZE_MB * 1024 * 1024);

  await app.register(cookie);
  await app.register(cors, {
    origin: env.WEB_URL,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "DELETE", "OPTIONS"],
  });

  await app.register(multipart, {
    throwFileSizeLimit: false,
    limits: {
      fileSize: maxFileSizeBytes,
      files: 1,
      fields: 4,
      parts: 6,
      fieldSize: 16 * 1024,
    },
  });

  // A especificação é estática para documentar os contratos existentes
  // sem introduzir validação automática nas rotas da aplicação.
  await app.register(swagger, {
    mode: "static",
    specification: {
      path: fileURLToPath(new URL("../openapi.json", import.meta.url)),
      baseDir: fileURLToPath(new URL("..", import.meta.url)),
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/documentation",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
  });

  const storage = options.storage ?? createS3Storage(env);
  const documents = createDocumentRepository(prisma);
  const analyzer = options.documentAnalyzer ?? createOpenAIAnalyzer(env);

  const documentService = createDocumentService({
    documents,
    storage,
    analyzer,
    logger: app.log,
    maxTextChars: env.MAX_TEXT_CHARS,
    maxFileSizeBytes,
  });

  await app.register(authRoutes(env));
  await app.register(documentsRoutes(env, documentService));
  await app.register(healthRoutes);

  if (env.NODE_ENV !== "test") {
    const deletionWorker = createDocumentDeletionWorker({
      documents,
      storage,
      logger: app.log,
    });

    deletionWorker.start();
    stopDocumentDeletionWorker = () => deletionWorker.stop();

    const analysisWorker = createDocumentAnalysisWorker({
      documents,
      storage,
      analyzer,
      logger: app.log,
      maxTextChars: env.MAX_TEXT_CHARS,
    });

    analysisWorker.start();
    stopDocumentAnalysisWorker = () => analysisWorker.stop();
  }

  return app;
}
