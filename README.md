# SFW_Testing

Sandbox repository for exercising the Software Factory end to end: agent runs,
diffs, pull requests, and flag-guarded releases.

The `src/checkout.js` module is intentionally small and dependency-free so an
agent can make a meaningful change and the tests still run in a second.

```bash
npm test
```
