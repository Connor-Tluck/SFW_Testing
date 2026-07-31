import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { createStoreServer } from "../src/server.js";

let base;
const server = createStoreServer();

before(async () => {
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const post = (path, body) =>
  fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

test("serves the storefront page", async () => {
  const response = await fetch(base + "/");
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Northwind Supply/);
});

test("exposes a client-side id for the browser SDK", async () => {
  const { clientId } = await fetch(base + "/api/config").then((r) => r.json());
  assert.ok(clientId && clientId.length > 0);
});

test("lists products", async () => {
  const { products } = await fetch(base + "/api/products").then((r) => r.json());
  assert.ok(products.some((product) => product.sku === "mug"));
});

test("checkout totals a cart", async () => {
  const response = await post("/api/checkout", { items: [{ sku: "mug", quantity: 2 }], region: "NY" });
  assert.equal(response.status, 200);
  const order = await response.json();
  assert.equal(order.subtotalCents, 2400);
  assert.equal(order.taxCents, 96);
  assert.equal(order.shippingCents, 599);
  assert.equal(order.totalCents, 3095);
  assert.ok(order.orderId);
});

test("checkout applies the SAVE10 promo code", async () => {
  const response = await post("/api/checkout", {
    items: [{ sku: "mug", quantity: 2 }],
    region: "NY",
    promoCode: "save10",
  });
  assert.equal(response.status, 200);
  const order = await response.json();
  assert.equal(order.promoCode, "SAVE10");
  assert.equal(order.subtotalCents, 2400);
  assert.equal(order.discountCents, 240);
  assert.equal(order.taxCents, 86);
  assert.equal(order.shippingCents, 599);
  assert.equal(order.totalCents, 2400 - 240 + 86 + 599);
});

test("checkout rejects an unknown promo code", async () => {
  const response = await post("/api/checkout", {
    items: [{ sku: "mug", quantity: 1 }],
    region: "NY",
    promoCode: "SAVE99",
  });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /Invalid promo code/);
});

test("checkout without a promo code reports zero discount", async () => {
  const response = await post("/api/checkout", { items: [{ sku: "mug", quantity: 1 }], region: "NY" });
  const order = await response.json();
  assert.equal(order.discountCents, 0);
  assert.equal(order.promoCode, null);
});

test("checkout rejects a bad cart with 400 rather than throwing", async () => {
  const response = await post("/api/checkout", { items: [], region: "NY" });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /Cart is empty/);
});

test("checkout rejects an unknown region", async () => {
  const response = await post("/api/checkout", { items: [{ sku: "mug", quantity: 1 }], region: "ZZ" });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /No tax rate configured/);
});

test("static requests cannot escape the public directory", async () => {
  const response = await fetch(base + "/../package.json");
  assert.notEqual(response.status, 200);
});
