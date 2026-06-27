import assert from "node:assert/strict";
import test from "node:test";

import {
  definePartyAddress,
  definePartyContact,
  definePartyRole,
} from "@/platform/public-api";
import {
  assertPartyStatusTransition,
  assertUniquePartyRoles,
  partyHasRole,
  selectDefaultPartyAddress,
  selectDefaultPartyContact,
} from "@/platform/server";

test("party foundation supports multiple roles on the same party", () => {
  const roles = [
    definePartyRole({ partyId: "party-1", roleType: "customer" }),
    definePartyRole({ partyId: "party-1", roleType: "supplier" }),
  ];

  assert.doesNotThrow(() => assertUniquePartyRoles(roles));
  assert.equal(partyHasRole(roles, "customer"), true);
  assert.equal(partyHasRole(roles, "supplier"), true);
  assert.equal(partyHasRole(roles, "employee"), false);
});

test("party foundation rejects duplicate active role assignments", () => {
  const roles = [
    definePartyRole({ partyId: "party-1", roleType: "customer" }),
    definePartyRole({ partyId: "party-1", roleType: "customer" }),
  ];

  assert.throws(() => assertUniquePartyRoles(roles), /duplicate active role/);
});

test("party foundation resolves default contacts and addresses", () => {
  const contacts = [
    definePartyContact({
      name: "Operations",
      partyId: "party-1",
      preferredContactMethod: "email",
    }),
    definePartyContact({
      isDefault: true,
      mobile: "+201000000000",
      name: "Accounts",
      partyId: "party-1",
      preferredContactMethod: "mobile",
    }),
  ];
  const addresses = [
    definePartyAddress({
      country: "EG",
      partyId: "party-1",
      type: "shipping",
    }),
    definePartyAddress({
      city: "Cairo",
      country: "EG",
      isDefault: true,
      partyId: "party-1",
      type: "billing",
    }),
  ];

  assert.equal(selectDefaultPartyContact(contacts)?.name, "Accounts");
  assert.equal(selectDefaultPartyAddress(addresses)?.type, "billing");
  assert.equal(selectDefaultPartyAddress(addresses, "shipping")?.type, "shipping");
});

test("party foundation prevents archived parties from changing status", () => {
  assert.doesNotThrow(() =>
    assertPartyStatusTransition({ from: "pending-approval", to: "active" }),
  );
  assert.throws(
    () => assertPartyStatusTransition({ from: "archived", to: "active" }),
    /Archived parties cannot transition/,
  );
});

