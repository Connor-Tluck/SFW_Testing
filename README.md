# Northwind Supply

A demo storefront used to exercise the Software Factory end to end: agents write
features, the AutoFactory chain wraps them in LaunchDarkly flags and metrics, and
the result ships behind a guarded rollout.

```bash
npm start   # http://localhost:3000
npm test
```

No dependencies and no build step, so a demo never dies on an install.

## Layout

| Path | What it is |
| --- | --- |
| `src/checkout.js` | Pricing rules — subtotal, tax, shipping. Money is integer cents throughout. |
| `src/catalog.js` | Products, and cart pricing that trusts the catalog over the request. |
| `src/server.js` | HTTP server: static files plus `/api/products` and `/api/checkout`. |
| `public/` | The storefront UI and the vendored LaunchDarkly browser SDK. |

## LaunchDarkly

The storefront talks to the **`ct-se-swf-app`** project — the data plane, where
agents create the flags and metrics for this product. It is deliberately not the
factory project that holds the agents themselves.

The client-side ID is read from `STORE_LD_CLIENT_ID`, falling back to the
`ct-se-swf-app` production environment. It is not named `LD_CLIENT_ID` because
the Software Factory sets that variable to its *own* project, and inheriting it
would silently point the storefront at the wrong one.

`public/app.js` emits these events, which is what gives metrics data to measure:

| Event | Fired when | Metric value |
| --- | --- | --- |
| `add-to-cart` | A product is added | — |
| `checkout-started` | Checkout is clicked | — |
| `checkout-completed` | An order succeeds | Order total in cents |
| `checkout-failed` | Checkout errors | — |

An event-backed metric has no data until something emits the event, so any new
measurable behaviour needs a `track()` call alongside it.
