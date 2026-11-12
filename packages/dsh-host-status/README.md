# @mygo/dsh-host-status

Thin Host plugin providing the two authenticated seams needed by an independent
DSH client:

- `GET /mygo/status` returns adapter and client-release status.
- `GET /mygo/index-injections` returns the original ordered index-injection table.

Both routes use `connection.admit(request)`, require the admitted owner Peer,
return `Cache-Control: no-store` and unregister through the Cordis effect
lifecycle. They do not relax Host/Origin trust, mint credentials, expose an
instance identity or replace Gateway authorization.

Install the package in the pinned Host and apply `host.patch.yml`. Focused tests:

```bash
node --test packages/dsh-host-status/test/*.test.js
```
