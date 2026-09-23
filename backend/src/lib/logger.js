import pino from "pino";
import { config } from "../config.js";

const options = {
  level: config.logLevel,
  base: { service: "next-africa-api", env: config.nodeEnv },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.password_hash",
      "*.token",
      "*.audio_base64",
      "*.content_base64",
    ],
    censor: "[redacted]",
  },
};

if (config.logPretty) {
  options.transport = {
    target: "pino-pretty",
    options: { colorize: true, translateTime: "SYS:standard", ignore: "pid,hostname" },
  };
}

export const logger = pino(options);

export function childLogger(bindings) {
  return logger.child(bindings);
}
