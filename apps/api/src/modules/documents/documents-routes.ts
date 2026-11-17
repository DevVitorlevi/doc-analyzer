import type { FastifyPluginCallback } from "fastify";

import type { Env } from "@/config/env";
import { authenticate } from "@/modules/auth/authenticate";

import {
  createDocumentHandler,
  createGetDocumentHandler,
  createListDocumentsHandler,
} from "./documents-controller";
import type { DocumentService } from "./documents-service";

export function documentsRoutes(
  env: Env,
  service: DocumentService,
): FastifyPluginCallback {
  return (app, _options, done) => {
    const auth = authenticate(env);

    app.post(
      "/documents",
      { preHandler: auth },
      createDocumentHandler(service),
    );

    app.get(
      "/documents",
      { preHandler: auth },
      createListDocumentsHandler(service),
    );

    app.get(
      "/documents/:id",
      { preHandler: auth },
      createGetDocumentHandler(service),
    );

    done();
  };
}
