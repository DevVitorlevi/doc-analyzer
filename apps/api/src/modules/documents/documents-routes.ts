import type { FastifyPluginCallback } from "fastify";
import type { Env } from "@/config/env";
import { authenticate } from "@/modules/auth/authenticate";
import { createDocumentHandler } from "./documents-controller";
import type { DocumentService } from "./documents-service";

export function documentsRoutes(
  env: Env,
  service: DocumentService,
): FastifyPluginCallback {
  return (app, _options, done) => {
    app.post(
      "/documents",
      { preHandler: authenticate(env) },
      createDocumentHandler(service),
    );

    done();
  };
}
