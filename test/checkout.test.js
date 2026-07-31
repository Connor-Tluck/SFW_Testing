import assert from "node:assert/strict";
import { test } from "node:test";

import { shippingFor, subtotal, taxFor, total } from "../src/checkout.js";

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
