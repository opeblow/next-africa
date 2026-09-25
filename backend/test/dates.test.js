import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveDueDate } from "../src/lib/dates.js";
const friday = new Date("2026-09-25T04:00:00Z");
test("relative dates use Nairobi once, and next Monday is actually Monday", () => {
  assert.equal(resolveDueDate("tomorrow at 3pm", "Africa/Nairobi", friday), "2026-09-26T12:00:00.000Z");
  assert.equal(resolveDueDate("next Monday at 10am", "Africa/Nairobi", friday), "2026-09-28T07:00:00.000Z");
});
test("local midnight, explicit offsets, and date-only deadlines", () => {
  assert.equal(resolveDueDate("tomorrow at 10am", "Africa/Nairobi", new Date("2026-09-25T22:30:00Z")), "2026-09-27T07:00:00.000Z");
  assert.equal(resolveDueDate("2026-10-02T14:00:00+03:00", "Africa/Lagos", friday), "2026-10-02T11:00:00.000Z");
  assert.equal(resolveDueDate("2 October 2026", "Africa/Nairobi", friday), "2026-10-02T20:59:00.000Z");
  assert.throws(() => resolveDueDate("someday", "Africa/Lagos", friday));
});
