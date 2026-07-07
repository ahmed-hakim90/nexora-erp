import "server-only";

const ZK_TIMEOUT_ERROR_CODES = [
  "TIMEOUT_ON_RECEIVING_REQUEST_DATA",
  "TIMEOUT_ON_WRITING_MESSAGE",
  "TIMEOUT_IN_RECEIVING_RESPONSE_AFTER_REQUESTING_DATA",
  "TIMEOUT WHEN RECEIVING PACKET",
] as const;

export type DeviceDriverErrorContext = Readonly<{
  ip?: string;
  operation?: string;
  port?: number;
}>;

type ZkErrorLike = Readonly<{
  command?: string;
  err?: Readonly<{ code?: string; message?: string }>;
  ip?: string;
  toast?: () => string;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function includesZkTimeoutCode(message: string): boolean {
  const normalized = message.toUpperCase();
  return ZK_TIMEOUT_ERROR_CODES.some((code) => normalized.includes(code));
}

function includesCommKeyRejection(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("communication key was rejected") ||
    normalized.includes("requires a communication key") ||
    normalized.includes("comm key")
  );
}

export function isCommKeyRejectionError(cause: unknown): boolean {
  if (cause instanceof Error) {
    if (includesCommKeyRejection(cause.message)) return true;
    if (cause.cause) return isCommKeyRejectionError(cause.cause);
  }

  if (isRecord(cause) && typeof cause.message === "string") {
    return includesCommKeyRejection(cause.message);
  }

  return includesCommKeyRejection(String(cause));
}

function formatOperationLabel(operation?: string): string {
  switch (operation) {
    case "connect":
      return "الاتصال بالجهاز";
    case "download_users":
      return "تحميل المستخدمين";
    case "download_punches":
      return "تحميل البصمات";
    case "authenticate":
      return "مصادقة الجهاز";
    default:
      return "مزامنة الجهاز";
  }
}

export function buildZkTimeoutArabicHint(context?: DeviceDriverErrorContext): string {
  const phase = formatOperationLabel(context?.operation);
  const endpoint = context?.ip
    ? `${context.ip}${context.port ? `:${context.port}` : ""}`
    : "الجهاز";

  return [
    `تعذر ${phase} — انتهت مهلة انتظار رد الجهاز (${endpoint}).`,
    "تحقق من:",
    "(1) مفتاح الاتصال Comm Key في إعدادات الجهاز يطابق المفتاح المُعرَّف على الجهاز،",
    "(2) أن الجهاز متصل بالشبكة ولا يستخدمه برنامج آخر مثل ZKTime أو BioTime،",
    "(3) عنوان IP والمنفذ صحيحان،",
    "(4) إعادة تشغيل الجهاز ثم إعادة المحاولة.",
  ].join(" ");
}

function normalizeZkEndpoint(command: string | undefined, ip: string | undefined, context?: DeviceDriverErrorContext): string {
  const resolvedIp = context?.ip ?? ip;
  const resolvedPort = context?.port;
  const resolvedOperation = context?.operation;

  if (command && !command.includes("undefined")) {
    if (resolvedIp && !command.includes(resolvedIp)) {
      return resolvedPort ? `${command} @ ${resolvedIp}:${resolvedPort}` : `${command} @ ${resolvedIp}`;
    }
    return command;
  }

  const transport = command?.startsWith("[UDP]") ? "UDP" : "TCP";
  const operationSuffix = resolvedOperation ? ` ${resolvedOperation}` : "";
  if (resolvedIp) {
    return resolvedPort
      ? `[${transport}]${operationSuffix} @ ${resolvedIp}:${resolvedPort}`
      : `[${transport}]${operationSuffix} @ ${resolvedIp}`;
  }
  return `[${transport}]${operationSuffix}`;
}

function appendTimeoutHint(message: string, context?: DeviceDriverErrorContext): string {
  if (includesCommKeyRejection(message)) return message;
  if (!includesZkTimeoutCode(message)) return message;
  const hint = buildZkTimeoutArabicHint(context);
  if (message.includes(hint)) return message;
  return `${message} — ${hint}`;
}

export function formatDeviceDriverError(cause: unknown, context?: DeviceDriverErrorContext): string {
  if (cause instanceof Error) {
    const message = cause.message.trim();
    if (message && message !== "[object Object]") {
      return appendTimeoutHint(message, context);
    }
    if (cause.cause) return formatDeviceDriverError(cause.cause, context);
  }

  if (isRecord(cause)) {
    const zkError = cause as ZkErrorLike;

    if (zkError.err || typeof zkError.toast === "function") {
      if (typeof zkError.toast === "function") {
        try {
          const toastMessage = zkError.toast().trim();
          if (toastMessage) {
            const endpoint = normalizeZkEndpoint(zkError.command, zkError.ip, context);
            return appendTimeoutHint(endpoint ? `${toastMessage} (${endpoint})` : toastMessage, context);
          }
        } catch {
          // Fall through to nested err fields.
        }
      }

      const parts: string[] = [];
      if (zkError.err?.message) parts.push(zkError.err.message);
      if (zkError.err?.code) parts.push(`[${zkError.err.code}]`);
      const endpoint = normalizeZkEndpoint(zkError.command, zkError.ip, context);
      if (endpoint) parts.push(`(${endpoint})`);
      if (parts.length > 0) return appendTimeoutHint(parts.join(" "), context);
    }

    if (typeof cause.message === "string" && cause.message.trim()) {
      return appendTimeoutHint(cause.message.trim(), context);
    }
    if (typeof cause.code === "string" && cause.code.trim()) {
      return appendTimeoutHint(cause.code.trim(), context);
    }

    try {
      const json = JSON.stringify(cause);
      if (json && json !== "{}") return appendTimeoutHint(json, context);
    } catch {
      // Ignore circular structures.
    }
  }

  return appendTimeoutHint(String(cause), context);
}

export function isRetryableZkDeviceError(cause: unknown): boolean {
  if (isCommKeyRejectionError(cause)) return false;
  const message = formatDeviceDriverError(cause).toLowerCase();
  return (
    includesZkTimeoutCode(message) ||
    message.includes("socket isn't connected") ||
    message.includes("econnreset") ||
    message.includes("another device is connecting")
  );
}

export function toDeviceDriverError(cause: unknown, context?: DeviceDriverErrorContext): Error {
  return new Error(formatDeviceDriverError(cause, context));
}
