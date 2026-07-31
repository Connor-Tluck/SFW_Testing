import assert from "node:assert/strict";
import { test } from "node:test";

import { discountFor, shippingFor, subtotal, taxFor, total } from "../src/checkout.js";

const items = [
  { sku: "mug", priceCents: 1200, quantity: 2 },
  { sku: "tee", priceCents: 2400, quantity: 1 },
];

test("subtotal multiplies by quantity", () => {
  assert.equal(subtotal(items), 4800);
});

test("tax rounds to whole cents", () => {
  assert.equal(taxFor(4800, "CA"), 348);
});

test("tax rejects unknown regions", () => {
  assert.throws(() => taxFor(4800, "ZZ"), /No tax rate configured/);
});

test("shipping is free over the threshold", () => {
  assert.equal(shippingFor(4999), 599);
  assert.equal(shippingFor(5000), 0);
  assert.equal(shippingFor(0), 0);
});

test("total sums its parts", () => {
  const result = total({ items, region: "NY" });
  assert.equal(result.subtotalCents, 4800);
  assert.equal(result.taxCents, 192);
  assert.equal(result.shippingCents, 599);
  assert.equal(result.totalCents, 5591);
});

test("discount rounds to whole cents", () => {
  // 4800 * 12.5% = 600 exactly; 333 * 10% = 33.3 -> 33; 335 * 10% = 33.5 -> 34
  assert.equal(discountFor(4800, 12.5), 600);
  assert.equal(discountFor(333, 10), 33);
  assert.equal(discountFor(335, 10), 34);
});

test("discount handles the 0 and 100 boundaries", () => {
  assert.equal(discountFor(4800, 0), 0);
  assert.equal(discountFor(4800, 100), 4800);
});

test("discount rejects percentages outside 0-100", () => {
  assert.throws(() => discountFor(4800, -1), /between 0 and 100/);
  assert.throws(() => discountFor(4800, 100.01), /between 0 and 100/);
});

test("total applies the discount before tax and shipping", () => {
  // 4800 - 10% = 4320 discounted subtotal; NY tax on 4320 = 172.8 -> 173;
  // 4320 < 5000 so shipping still applies.
  const result = total({ items, region: "NY", discountPercent: 10 });
  assert.equal(result.subtotalCents, 4800);
  assert.equal(result.discountCents, 480);
  assert.equal(result.taxCents, 173);
  assert.equal(result.shippingCents, 599);
  assert.equal(result.totalCents, 4320 + 173 + 599);
});

test("total without a discount is unchanged", () => {
  const result = total({ items, region: "NY" });
  assert.equal(result.discountCents, 0);
  assert.equal(result.totalCents, 5591);
});
