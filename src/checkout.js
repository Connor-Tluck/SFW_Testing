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

// Promo codes either take a fractional discount off the subtotal or waive
// shipping — never both.
const PROMO_CODES = {
  SAVE10: { discountRate: 0.1 },
  FREESHIP: { freeShipping: true },
};

/**
 * Normalize a promo code and look it up. Returns null when no code was given,
 * throws on an unknown code, and otherwise returns the promo with its
 * canonical code attached.
 */
export function promoFor(promoCode) {
  if (promoCode === undefined || promoCode === null) return null;
  const code = String(promoCode).trim().toUpperCase();
  if (code === "") return null;
  const promo = PROMO_CODES[code];
  if (promo === undefined) throw new Error(`Invalid promo code: ${code}`);
  return { code, ...promo };
}

export function subtotal(items) {
  return items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
}

export function discountFor(subtotalCents, promoCode) {
  const promo = promoFor(promoCode);
  if (!promo?.discountRate) return 0;
  return Math.round(subtotalCents * promo.discountRate);
}

export function taxFor(subtotalCents, region) {
  const rate = TAX_RATES[region];
  if (rate === undefined) throw new Error(`No tax rate configured for region: ${region}`);
  return Math.round(subtotalCents * rate);
}

export function shippingFor(subtotalCents, promoCode) {
  if (subtotalCents === 0) return 0;
  if (promoFor(promoCode)?.freeShipping) return 0;
  return subtotalCents >= 5000 ? 0 : 599;
}

export function total({ items, region, promoCode }) {
  const promo = promoFor(promoCode);
  const goods = subtotal(items);
  const discount = discountFor(goods, promoCode);
  // Tax and the free-shipping threshold apply to what the customer actually
  // pays for goods, i.e. the subtotal after any promo discount.
  const discounted = goods - discount;
  return {
    promoCode: promo?.code ?? null,
    freeShipping: Boolean(promo?.freeShipping),
    subtotalCents: goods,
    discountCents: discount,
    taxCents: taxFor(discounted, region),
    shippingCents: shippingFor(discounted, promoCode),
    get totalCents() {
      return this.subtotalCents - this.discountCents + this.taxCents + this.shippingCents;
    },
  };
}
