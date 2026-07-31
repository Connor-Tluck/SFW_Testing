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
  assert.equal(result.discountCents, 0);
  assert.equal(result.taxCents, 192);
  assert.equal(result.shippingCents, 599);
  assert.equal(result.totalCents, 5591);
});

test("SAVE10 takes 10% off the subtotal, rounded to whole cents", () => {
  assert.equal(discountFor(4800, "SAVE10"), 480);
  assert.equal(discountFor(1205, "SAVE10"), 121); // 120.5 rounds up
});

test("promo codes are case-insensitive and whitespace-tolerant", () => {
  assert.equal(discountFor(4800, "  save10 "), 480);
});

test("no promo code means no discount", () => {
  assert.equal(discountFor(4800, undefined), 0);
  assert.equal(discountFor(4800, ""), 0);
  assert.equal(discountFor(4800, "   "), 0);
});

test("unknown promo codes are rejected", () => {
  assert.throws(() => discountFor(4800, "SAVE99"), /Invalid promo code/);
});

test("total applies the promo discount before tax and shipping", () => {
  const result = total({ items, region: "NY", promoCode: "SAVE10" });
  assert.equal(result.subtotalCents, 4800);
  assert.equal(result.discountCents, 480);
  // Tax and the free-shipping threshold use the discounted subtotal (4320).
  assert.equal(result.taxCents, 173);
  assert.equal(result.shippingCents, 599);
  assert.equal(result.totalCents, 4800 - 480 + 173 + 599);
});

test("a discount can drop an order below the free-shipping threshold", () => {
  const bigCart = [{ sku: "kettle", priceCents: 5200, quantity: 1 }];
  const withoutPromo = total({ items: bigCart, region: "TX" });
  assert.equal(withoutPromo.shippingCents, 0);
  const withPromo = total({ items: bigCart, region: "TX", promoCode: "SAVE10" });
  assert.equal(withPromo.discountCents, 520);
  assert.equal(withPromo.shippingCents, 599); // 4680 is under the 5000 threshold
});
