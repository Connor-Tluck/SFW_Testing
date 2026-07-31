/**
 * Storefront UI.
 *
 * Two things here exist for LaunchDarkly rather than for shoppers: a context key
 * that survives reloads, so a visitor stays in the same experiment bucket, and a
 * `track()` call on every step of the funnel. Event-backed metrics have no data
 * until something emits the event, so a guarded rollout is only as good as this
 * instrumentation.
 */

const money = (cents) => `$${(cents / 100).toFixed(2)}`;

const cart = new Map();
let products = [];
let ld;

// ---------------------------------------------------------------------------
// LaunchDarkly
// ---------------------------------------------------------------------------

function visitorKey() {
  let key = localStorage.getItem("visitor-key");
  if (!key) {
    key = `visitor-${crypto.randomUUID().slice(0, 8)}`;
    localStorage.setItem("visitor-key", key);
  }
  return key;
}

function setStatus(text, state) {
  const el = document.getElementById("ld-status");
  el.textContent = `LaunchDarkly: ${text}`;
  el.className = `status status-${state}`;
}

function track(event, data, metricValue) {
  if (!ld) return;
  ld.track(event, data, metricValue);
}

function applyFlags() {
  const banner = document.getElementById("banner");
  const text = ld.variation("store-announcement-banner", "");
  banner.textContent = text;
  banner.hidden = !text;
}

async function initLaunchDarkly() {
  try {
    const { clientId } = await fetch("/api/config").then((r) => r.json());
    if (!clientId || !window.LDClient) {
      setStatus("not configured", "error");
      return;
    }
    ld = window.LDClient.initialize(clientId, { kind: "user", key: visitorKey(), anonymous: true });
    await ld.waitForInitialization(5);
    setStatus("connected", "ready");
    applyFlags();
    // Flag changes stream in, so the UI reflects a toggle without a reload.
    ld.on("change", applyFlags);
  } catch {
    setStatus("offline — using defaults", "error");
  }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function renderProducts() {
  const grid = document.getElementById("products");
  grid.removeAttribute("aria-busy");
  grid.innerHTML = "";
  for (const product of products) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="art">${product.emoji ?? "📦"}</div>
      <div class="name">${product.name}</div>
      <div class="blurb">${product.blurb ?? ""}</div>
      <div class="row">
        <span class="price">${money(product.priceCents)}</span>
        <button class="secondary" data-sku="${product.sku}">Add</button>
      </div>`;
    card.querySelector("button").addEventListener("click", () => addToCart(product));
    grid.append(card);
  }
}

function renderCart() {
  const lines = document.getElementById("cart-lines");
  const count = [...cart.values()].reduce((sum, line) => sum + line.quantity, 0);
  document.getElementById("cart-pill").textContent = `Cart: ${count} item${count === 1 ? "" : "s"}`;
  document.getElementById("checkout").disabled = count === 0;

  lines.innerHTML = "";
  if (count === 0) {
    lines.innerHTML = '<li class="muted empty">Nothing here yet.</li>';
    document.getElementById("totals").hidden = true;
    return;
  }

  for (const line of cart.values()) {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${line.name} <span class="qty">x${line.quantity}</span></span>
      <span>${money(line.priceCents * line.quantity)}</span>`;
    lines.append(li);
  }
  renderTotals();
}

/**
 * Totals come from the server so the browser and the order share one
 * implementation — the pricing rules live in src/checkout.js, not here.
 */
async function renderTotals() {
  const totals = document.getElementById("totals");
  try {
    const order = await priceOrder();
    document.getElementById("t-subtotal").textContent = money(order.subtotalCents);
    document.getElementById("t-tax").textContent = money(order.taxCents);
    document.getElementById("t-shipping").textContent =
      order.shippingCents === 0 ? "Free" : money(order.shippingCents);
    document.getElementById("t-total").textContent = money(order.totalCents);
    totals.hidden = false;
  } catch {
    totals.hidden = true;
  }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function addToCart(product) {
  const line = cart.get(product.sku);
  cart.set(product.sku, {
    ...product,
    quantity: (line?.quantity ?? 0) + 1,
  });
  track("add-to-cart", { sku: product.sku });
  renderCart();
}

function cartPayload() {
  return {
    items: [...cart.values()].map((line) => ({ sku: line.sku, quantity: line.quantity })),
    region: document.getElementById("region").value,
  };
}

async function priceOrder() {
  const response = await fetch("/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cartPayload()),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Checkout failed");
  return body;
}

async function checkout() {
  const button = document.getElementById("checkout");
  const error = document.getElementById("cart-error");
  button.disabled = true;
  error.hidden = true;
  track("checkout-started");

  try {
    const order = await priceOrder();
    // The order value rides along as the metric value, so revenue-shaped metrics
    // can be built off the same event as conversion.
    track("checkout-completed", { orderId: order.orderId, region: order.region }, order.totalCents);
    document.getElementById("order-id").textContent = order.orderId;
    document.getElementById("order-total").textContent = money(order.totalCents);
    document.getElementById("confirmation").hidden = false;
    cart.clear();
    renderCart();
  } catch (failure) {
    track("checkout-failed", { reason: failure.message });
    error.textContent = failure.message;
    error.hidden = false;
    button.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

document.getElementById("checkout").addEventListener("click", checkout);
document.getElementById("region").addEventListener("change", renderCart);
document.getElementById("keep-shopping").addEventListener("click", () => {
  document.getElementById("confirmation").hidden = true;
});

fetch("/api/products")
  .then((r) => r.json())
  .then(({ products: list }) => {
    products = list;
    renderProducts();
    renderCart();
  });

initLaunchDarkly();
