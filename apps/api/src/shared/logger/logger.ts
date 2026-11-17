import { pino, type Logger, type LoggerOptions } from "pino";

export function buildLoggerOptions(level: string): LoggerOptions {
  return {
    level,
    redact: [
      "req.headers.authorization",
      "req.headers.cookie",
      'res.headers["set-cookie"]',
    ],
  };
}

export function createLogger(level = "info"): Logger {
  return pino(buildLoggerOptions(level));
}
