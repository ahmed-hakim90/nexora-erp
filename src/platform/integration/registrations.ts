import {
  defineEventDefinition,
  defineEventName,
  defineModuleEventRegistration,
  defineModuleIntegrationRegistration,
} from "./public-api";

export const PLATFORM_EVENT_NAMES = {
  eventPublished: defineEventName("platform.event.published"),
  webhookDeliveryFailed: defineEventName("platform.webhook.delivery_failed"),
  importPreviewCreated: defineEventName("platform.import.preview_created"),
  exportRequested: defineEventName("platform.export.requested"),
} as const;

export const platformEventRegistration = defineModuleEventRegistration({
  moduleKey: "platform",
  events: [
    defineEventDefinition({
      description: "Recorded after a registered event is accepted by the platform bus.",
      kind: "integration",
      moduleKey: "platform",
      name: PLATFORM_EVENT_NAMES.eventPublished,
      payloadSchemaKey: "platform.event-published.v1",
      version: 1,
    }),
    defineEventDefinition({
      description: "Recorded when an outgoing webhook delivery exhausts retry policy.",
      kind: "integration",
      moduleKey: "platform",
      name: PLATFORM_EVENT_NAMES.webhookDeliveryFailed,
      payloadSchemaKey: "platform.webhook-delivery-failed.v1",
      version: 1,
    }),
    defineEventDefinition({
      description: "Recorded when a generic import preview is prepared for validation.",
      kind: "integration",
      moduleKey: "platform",
      name: PLATFORM_EVENT_NAMES.importPreviewCreated,
      payloadSchemaKey: "platform.import-preview-created.v1",
      version: 1,
    }),
    defineEventDefinition({
      description: "Recorded when a generic export is requested for async processing.",
      kind: "integration",
      moduleKey: "platform",
      name: PLATFORM_EVENT_NAMES.exportRequested,
      payloadSchemaKey: "platform.export-requested.v1",
      version: 1,
    }),
  ],
});

export const platformIntegrationRegistration = defineModuleIntegrationRegistration({
  moduleKey: "platform",
  integrations: [
    {
      apiVersions: ["v1", "v2"],
      channel: "webhook",
      direction: "outbound",
      eventNames: [
        PLATFORM_EVENT_NAMES.eventPublished,
        PLATFORM_EVENT_NAMES.webhookDeliveryFailed,
      ],
      key: "platform.outgoing-webhooks",
      moduleKey: "platform",
      name: "Outgoing Webhooks",
      requiresCredentials: true,
    },
    {
      apiVersions: ["v1", "v2"],
      channel: "api",
      direction: "inbound",
      eventNames: [
        PLATFORM_EVENT_NAMES.importPreviewCreated,
        PLATFORM_EVENT_NAMES.exportRequested,
      ],
      key: "platform.generic-import-export",
      moduleKey: "platform",
      name: "Generic Import And Export",
      requiresCredentials: false,
    },
    {
      apiVersions: ["v1", "v2"],
      channel: "background",
      direction: "bidirectional",
      eventNames: [PLATFORM_EVENT_NAMES.eventPublished],
      key: "platform.background-event-handlers",
      moduleKey: "platform",
      name: "Background Event Handlers",
      requiresCredentials: false,
    },
  ],
});

export const platformApiVersions = [
  {
    introducedAt: "2026-06-25",
    notes: "Initial stable integration API contract.",
    status: "active",
    version: "v1",
  },
  {
    introducedAt: "2026-06-25",
    notes: "Reserved for additive future integration APIs.",
    status: "draft",
    version: "v2",
  },
] as const;
