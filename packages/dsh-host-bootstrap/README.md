# @mygo/dsh-host-bootstrap

Thin Host plugin providing the authenticated bootstrap seam needed by an independent
DSH client:

- `GET /mygo/index-injections` returns the original ordered index-injection table.

The route uses `connection.admit(request)`, requires the admitted owner Peer,
returns `Cache-Control: no-store` and unregisters through the Cordis effect
lifecycle. It does not relax Host/Origin trust, mint credentials, expose an
instance identity or replace Gateway authorization.

Install the package in the pinned Host and apply `host.patch.yml`. Focused tests:

```bash
node --test packages/dsh-host-bootstrap/test/*.test.js
```
