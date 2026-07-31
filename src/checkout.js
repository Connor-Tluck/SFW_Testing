/**
 * Order totals for the sandbox storefront.
 *
 * Money is handled in integer cents throughout; converting to floats anywhere in
 * this file reintroduces rounding drift that the tests are written to catch.
 */

const TAX_RATES = {
  CA: 0.0725,
  NY: 0.04,
  TX: 0.0625,
};

export function subtotal(items) {
  return items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
}

export function taxFor(subtotalCents, region) {
  const rate = TAX_RATES[region];
  if (rate === undefined) throw new Error(`No tax rate configured for region: ${region}`);
  return Math.round(subtotalCents * rate);
}

export function shippingFor(subtotalCents) {
  if (subtotalCents === 0) return 0;
  return subtotalCents >= 5000 ? 0 : 599;
}

export function total({ items, region }) {
  const goods = subtotal(items);
  return {
    subtotalCents: goods,
    taxCents: taxFor(goods, region),
    shippingCents: shippingFor(goods),
    get totalCents() {
      return this.subtotalCents + this.taxCents + this.shippingCents;
    },
  };
}
