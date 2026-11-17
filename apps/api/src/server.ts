import { buildApp } from "./app";
import { EnvValidationError, loadEnv } from "./config/env";
import { createLogger } from "./shared/logger/logger";

async function start(): Promise<void> {
  const bootLogger = createLogger();

  try {
    const env = loadEnv();
    const app = await buildApp(env);
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
  } catch (error) {
    if (error instanceof EnvValidationError) {
      bootLogger.error(
        { variables: error.variables },
        "Invalid environment configuration",
      );
    } else {
      bootLogger.error({ err: error }, "Failed to start the API");
    }
    process.exit(1);
  }
}

void start();
