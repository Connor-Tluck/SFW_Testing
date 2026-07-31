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

// Promo codes map to a fractional discount off the subtotal.
const PROMO_CODES = {
  SAVE10: 0.1,
};

export function subtotal(items) {
  return items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
}

export function discountFor(subtotalCents, promoCode) {
  if (promoCode === undefined || promoCode === null) return 0;
  const code = String(promoCode).trim().toUpperCase();
  if (code === "") return 0;
  const rate = PROMO_CODES[code];
  if (rate === undefined) throw new Error(`Invalid promo code: ${code}`);
  return Math.round(subtotalCents * rate);
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

export function total({ items, region, promoCode }) {
  const goods = subtotal(items);
  const discount = discountFor(goods, promoCode);
  // Tax and the free-shipping threshold apply to what the customer actually
  // pays for goods, i.e. the subtotal after any promo discount.
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
