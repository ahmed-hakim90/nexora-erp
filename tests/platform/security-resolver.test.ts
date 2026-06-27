import assert from "node:assert/strict";
import test from "node:test";

import {
  createInMemoryPermissionResolverSource,
  defineCustomRole,
  defineDataScope,
  defineEntitlement,
  definePermission,
  defineSecurityMetadata,
  resolvePermission,
  type PermissionResolutionRequest,
} from "@/platform/security/public-api";
import { definePermissionKey } from "@/platform/permissions/public-api";

const permissionKey = definePermissionKey("platform.security.view");

const permission = definePermission({
  action: "view",
  categoryKey: "platform",
  description: "View security metadata.",
  experiences: ["erp"],
  groupKey: "security",
  key: permissionKey,
  label: "View security",
  metadata: defineSecurityMetadata({
    auditRequired: true,
    dataScopeRequired: true,
    riskLevel: "high",
    sensitiveData: true,
  }),
  ownerKey: "platform",
  resource: "security",
});

const role = defineCustomRole({
  description: "Security reader role.",
  isAssignable: true,
  isSystemRole: false,
  key: "security-reader",
  label: "Security Reader",
  permissionKeys: [permissionKey],
  tenantId: "tenant-1",
  type: "custom",
});

const request: PermissionResolutionRequest = {
  entitlementKey: "platform.security",
  experience: "erp",
  identity: {
    identityId: "identity-1",
    principalId: "principal-1",
    userId: "user-1",
  },
  permission: permissionKey,
  requestedDataScope: defineDataScope({
    kind: "company",
    companyIds: ["company-1"],
    tenantId: "tenant-1",
  }),
  tenantId: "tenant-1",
};

test("permission resolver allows identity with entitlement, role, permission, and data scope", async () => {
  const source = createInMemoryPermissionResolverSource({
    entitlements: [
      defineEntitlement({
        appKey: "platform",
        key: "platform.security",
        status: "active",
        tenantId: "tenant-1",
      }),
    ],
    permissions: [permission],
    roleAssignments: [
      {
        role,
        scope: defineDataScope({
          kind: "company",
          companyIds: ["company-1"],
          tenantId: "tenant-1",
        }),
      },
    ],
  });

  const result = await resolvePermission(request, source);

  assert.equal(result.allowed, true);
  assert.equal(result.decision, "allowed");
  assert.deepEqual(result.matchedRoles.map((matchedRole) => matchedRole.key), [
    "security-reader",
  ]);
});

test("permission resolver denies when tenant entitlement is missing", async () => {
  const source = createInMemoryPermissionResolverSource({
    permissions: [permission],
    roleAssignments: [
      {
        role,
        scope: defineDataScope({
          kind: "tenant",
          tenantId: "tenant-1",
        }),
      },
    ],
  });

  const result = await resolvePermission(request, source);

  assert.equal(result.allowed, false);
  assert.equal(result.reasons[0]?.code, "entitlement.missing");
});

test("permission resolver denies unsupported experiences before role checks", async () => {
  const source = createInMemoryPermissionResolverSource({
    permissions: [permission],
    roleAssignments: [],
  });

  const result = await resolvePermission(
    {
      ...request,
      entitlementKey: undefined,
      experience: "portal",
    },
    source,
  );

  assert.equal(result.allowed, false);
  assert.equal(result.reasons[0]?.stage, "experience");
});

test("permission resolver keeps permissions independent from data scope", async () => {
  const source = createInMemoryPermissionResolverSource({
    entitlements: [
      defineEntitlement({
        appKey: "platform",
        key: "platform.security",
        status: "active",
        tenantId: "tenant-1",
      }),
    ],
    permissions: [permission],
    roleAssignments: [
      {
        role,
        scope: defineDataScope({
          companyIds: ["company-2"],
          kind: "company",
          tenantId: "tenant-1",
        }),
      },
    ],
  });

  const result = await resolvePermission(request, source);

  assert.equal(result.allowed, false);
  assert.equal(result.reasons[0]?.code, "data-scope.insufficient");
  assert.deepEqual(result.matchedRoles.map((matchedRole) => matchedRole.key), [
    "security-reader",
  ]);
});

