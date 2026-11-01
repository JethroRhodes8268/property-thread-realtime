import test from "node:test";
import assert from "node:assert/strict";
import { decideThreadState, threadBody } from "../src/property_thread.js";

test("typing event produces a tenant-facing typing state", () => {
  const input = threadBody.parse({ propertyId: "p-12", tenantId: "tenant-7", kind: "typing" });
  assert.deepEqual(decideThreadState(input), { state: "typing", label: "tenant-7 is typing" });
});
