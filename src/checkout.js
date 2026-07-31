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

export function discountFor(subtotalCents, percent) {
  if (percent < 0 || percent > 100) {
    throw new Error(`Discount percent must be between 0 and 100: ${percent}`);
  }
  return Math.round((subtotalCents * percent) / 100);
}

export function total({ items, region, discountPercent = 0 }) {
  const goods = subtotal(items);
  const discount = discountFor(goods, discountPercent);
  const discounted = goods - discount;
  return {
    subtotalCents: goods,
    discountCents: discount,
    taxCents: taxFor(discounted, region),
    shippingCents: shippingFor(discounted),
    get totalCents() {
      return this.subtotalCents - this.discountCents + this.taxCents + this.shippingCents;
    },
  };
}
