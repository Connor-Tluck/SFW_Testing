import assert from "node:assert/strict";
import { test } from "node:test";

import { findProduct, listProducts, priceCart } from "../src/catalog.js";

test("catalog exposes products priced in whole cents", () => {
  const products = listProducts();
  assert.ok(products.length > 0);
  for (const product of products) {
    assert.ok(Number.isInteger(product.priceCents), `${product.sku} is not integer cents`);
    assert.ok(product.priceCents > 0);
  }
});

test("listProducts hands out copies, not the catalog itself", () => {
  listProducts()[0].priceCents = 1;
  assert.notEqual(listProducts()[0].priceCents, 1);
});

test("priceCart prices from the catalog rather than the request", () => {
  const [line] = priceCart([{ sku: "mug", quantity: 2, priceCents: 1 }]);
  assert.equal(line.priceCents, findProduct("mug").priceCents);
  assert.equal(line.quantity, 2);
});

test("priceCart rejects empty carts, unknown skus, and bad quantities", () => {
  assert.throws(() => priceCart([]), /Cart is empty/);
  assert.throws(() => priceCart([{ sku: "nope", quantity: 1 }]), /Unknown product/);
  assert.throws(() => priceCart([{ sku: "mug", quantity: 0 }]), /Invalid quantity/);
  assert.throws(() => priceCart([{ sku: "mug", quantity: 1.5 }]), /Invalid quantity/);
});
