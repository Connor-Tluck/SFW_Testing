/**
 * The storefront catalog.
 *
 * Prices are integer cents to match src/checkout.js, which is the single source
 * of truth for order totals.
 */

const PRODUCTS = [
  { sku: "mug", name: "Enamel Mug", blurb: "12oz, dishwasher safe", priceCents: 1200, emoji: "☕" },
  { sku: "tee", name: "Cotton Tee", blurb: "Heavyweight, unisex fit", priceCents: 2400, emoji: "👕" },
  { sku: "hoodie", name: "Zip Hoodie", blurb: "Brushed fleece lining", priceCents: 6800, emoji: "🧥" },
  { sku: "cap", name: "Six-Panel Cap", blurb: "Adjustable strap", priceCents: 2800, emoji: "🧢" },
  { sku: "tote", name: "Canvas Tote", blurb: "Reinforced handles", priceCents: 1800, emoji: "👜" },
  { sku: "stickers", name: "Sticker Pack", blurb: "Six weatherproof vinyl", priceCents: 600, emoji: "✨" },
];

export function listProducts() {
  return PRODUCTS.map((product) => ({ ...product }));
}

export function findProduct(sku) {
  return PRODUCTS.find((product) => product.sku === sku);
}

/**
 * Turn `[{ sku, quantity }]` from the browser into priced line items.
 *
 * Prices are looked up here rather than trusted from the request, so a tampered
 * cart cannot set its own totals.
 */
export function priceCart(lines) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new Error("Cart is empty.");
  }
  return lines.map((line) => {
    const product = findProduct(line.sku);
    if (!product) throw new Error(`Unknown product: ${line.sku}`);
    const quantity = Number(line.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error(`Invalid quantity for ${line.sku}: ${line.quantity}`);
    }
    return { sku: product.sku, name: product.name, priceCents: product.priceCents, quantity };
  });
}
