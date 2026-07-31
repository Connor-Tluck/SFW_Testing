/**
 * The storefront server.
 *
 * Dependency-free on purpose: `node src/server.js` is the whole run story, so a
 * demo never fails on an install step and agents can change behaviour without
 * touching build tooling.
 */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

import { listProducts, priceCart } from "./catalog.js";
import { total } from "./checkout.js";

const PUBLIC_DIR = fileURLToPath(new URL("../public/", import.meta.url));
const PORT = Number(process.env.PORT ?? 3000);

/**
 * The client-side ID for the LaunchDarkly project this product lives in.
 *
 * Deliberately not `LD_CLIENT_ID`: the Software Factory sets that to its own
 * factory project, and inheriting it would point the storefront at the wrong
 * project. Client-side IDs are safe to expose — that is what they are for.
 */
const LD_CLIENT_ID = process.env.STORE_LD_CLIENT_ID ?? "6a6be9d0373f500b6096db2c";

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(payload);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function serveStatic(res, urlPath) {
  const relative = urlPath === "/" ? "index.html" : normalize(urlPath).replace(/^(\.\.[/\\])+/, "").slice(1);
  const file = join(PUBLIC_DIR, relative);
  // `normalize` above collapses traversal, but the prefix check is what actually
  // guarantees a request can never escape public/.
  if (!file.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": CONTENT_TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

export async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "GET" && url.pathname === "/api/config") {
    return sendJson(res, 200, { clientId: LD_CLIENT_ID });
  }

  if (req.method === "GET" && url.pathname === "/api/products") {
    return sendJson(res, 200, { products: listProducts() });
  }

  if (req.method === "POST" && url.pathname === "/api/checkout") {
    try {
      const body = await readJsonBody(req);
      const items = priceCart(body.items);
      const order = total({ items, region: body.region, promoCode: body.promoCode });
      return sendJson(res, 200, {
        orderId: randomUUID().slice(0, 8).toUpperCase(),
        items,
        region: body.region,
        promoCode: order.discountCents > 0 ? String(body.promoCode).trim().toUpperCase() : null,
        subtotalCents: order.subtotalCents,
        discountCents: order.discountCents,
        taxCents: order.taxCents,
        shippingCents: order.shippingCents,
        totalCents: order.totalCents,
      });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  if (req.method === "GET") return serveStatic(res, url.pathname);

  res.writeHead(405, { "content-type": "text/plain; charset=utf-8" });
  res.end("Method not allowed");
}

export function createStoreServer() {
  return createServer((req, res) => {
    handleRequest(req, res).catch((error) => {
      sendJson(res, 500, { error: error.message });
    });
  });
}

// Only listen when run directly, so tests can start the server on their own port.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createStoreServer().listen(PORT, () => {
    console.log(`storefront on http://localhost:${PORT}`);
  });
}
