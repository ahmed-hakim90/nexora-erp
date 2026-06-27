import type { RequestContext } from "@/core/context";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Readonly<{
  correlationId?: string;
  tenantId?: string;
  companyId?: string;
  branchId?: string;
  userId?: string;
  module?: string;
  action?: string;
  source?: string;
  experience?: string;
  actorType?: string;
  [key: string]: unknown;
}>;

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  child(context: LogContext): Logger;
}

function normalizeLogContext(context: LogContext): LogContext {
  return Object.fromEntries(
    Object.entries(context).filter(([, value]) => value !== undefined),
  ) as LogContext;
}

export function createLogContextFromRequest(
  context: RequestContext,
  extra: LogContext = {},
): LogContext {
  return normalizeLogContext({
    actorType: context.actorType,
    branchId: context.branchId,
    companyId: context.companyId,
    correlationId: context.correlationId,
    experience: context.experience,
    source: context.source,
    tenantId: context.tenantId,
    userId: context.userId,
    ...extra,
  });
}

function write(level: LogLevel, message: string, context: LogContext = {}) {
  const entry = {
    level,
    message,
    context: normalizeLogContext(context),
    timestamp: new Date().toISOString(),
  };

  if (level === "error") {
    console.error(entry);
    return;
  }

  if (level === "warn") {
    console.warn(entry);
    return;
  }

  console.log(entry);
}

export function createPlatformLogger(baseContext: LogContext = {}): Logger {
  const mergedContext = normalizeLogContext(baseContext);

  return {
    debug: (message, context) =>
      write("debug", message, { ...mergedContext, ...context }),
    info: (message, context) =>
      write("info", message, { ...mergedContext, ...context }),
    warn: (message, context) =>
      write("warn", message, { ...mergedContext, ...context }),
    error: (message, context) =>
      write("error", message, { ...mergedContext, ...context }),
    child: (context) => createPlatformLogger({ ...mergedContext, ...context }),
  };
}

export const logger: Logger = createPlatformLogger();
