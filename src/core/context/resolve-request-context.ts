import "server-only";

import { headers } from "next/headers";

import {
  DEFAULT_REQUEST_DIRECTION,
  DEFAULT_REQUEST_LOCALE,
  DEFAULT_REQUEST_TIMEZONE,
  DEFAULT_RUNTIME_SOURCE,
  type ActorType,
  type AccessExperience,
  type RequestContext,
  type RuntimeSource,
} from "./request-context";
import { normalizeCorrelationId } from "./correlation-id";
import { CORRELATION_ID_HEADER } from "./correlation-propagation";

type RequestHeaders = Pick<Headers, "get">;

export type RequestHeadersProvider = () => RequestHeaders | Promise<RequestHeaders>;

const SUPPORTED_EXPERIENCES = new Set<AccessExperience>([
  "admin",
  "ai",
  "api",
  "automation",
  "connector",
  "customer-portal",
  "driver-app",
  "employee-portal",
  "erp",
  "marketplace",
  "portal",
  "sandbox",
  "supplier-portal",
  "system",
  "technician-app",
]);

const SUPPORTED_ACTORS = new Set<ActorType>([
  "ai-agent",
  "automation",
  "customer",
  "driver",
  "employee",
  "integration",
  "service",
  "service-account",
  "supplier",
  "technician",
  "user",
]);

const SUPPORTED_RUNTIME_SOURCES = new Set<RuntimeSource>([
  "ai-action",
  "api",
  "approval",
  "audit",
  "background-job",
  "server-action",
  "system",
  "web",
  "workflow",
]);

function readHeaderValue(headersList: RequestHeaders, key: string): string | undefined {
  const value = headersList.get(key)?.trim();
  return value && value.length > 0 ? value : undefined;
}

function readExperience(
  requested: AccessExperience,
  headersList: RequestHeaders,
): AccessExperience {
  const headerExperience = readHeaderValue(headersList, "x-nexora-experience");

  if (!headerExperience) {
    return requested;
  }

  if (!SUPPORTED_EXPERIENCES.has(headerExperience as AccessExperience)) {
    return requested;
  }

  return headerExperience as AccessExperience;
}

function readActorType(headersList: RequestHeaders): ActorType {
  const actorType = readHeaderValue(headersList, "x-nexora-actor-type");

  if (!actorType || !SUPPORTED_ACTORS.has(actorType as ActorType)) {
    return "user";
  }

  return actorType as ActorType;
}

function readRuntimeSource(headersList: RequestHeaders): RuntimeSource {
  const source = readHeaderValue(headersList, "x-nexora-runtime-source");

  if (!source || !SUPPORTED_RUNTIME_SOURCES.has(source as RuntimeSource)) {
    return DEFAULT_RUNTIME_SOURCE;
  }

  return source as RuntimeSource;
}

function readLocale(headersList: RequestHeaders): RequestContext["locale"] {
  const locale = readHeaderValue(headersList, "x-nexora-locale");
  return locale === "ar" ? "ar" : DEFAULT_REQUEST_LOCALE;
}

export async function resolveRequestContext(
  experience: AccessExperience,
  headersProvider: RequestHeadersProvider = headers,
): Promise<RequestContext> {
  const requestHeaders = await headersProvider();
  const correlationId = normalizeCorrelationId(
    requestHeaders.get(CORRELATION_ID_HEADER),
  );
  const locale = readLocale(requestHeaders);

  return {
    actorType: readActorType(requestHeaders),
    experience: readExperience(experience, requestHeaders),
    correlationId,
    source: readRuntimeSource(requestHeaders),
    locale,
    direction: readHeaderValue(requestHeaders, "x-nexora-direction") === "rtl" || locale === "ar"
      ? "rtl"
      : DEFAULT_REQUEST_DIRECTION,
    timezone: readHeaderValue(requestHeaders, "x-nexora-timezone") ?? DEFAULT_REQUEST_TIMEZONE,
    serviceKey: readHeaderValue(requestHeaders, "x-nexora-service-key"),
    integrationKey: readHeaderValue(requestHeaders, "x-nexora-integration-key"),
    automationKey: readHeaderValue(requestHeaders, "x-nexora-automation-key"),
    aiActionKey: readHeaderValue(requestHeaders, "x-nexora-ai-action-key"),
  };
}
