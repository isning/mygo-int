# Explicit instance routes and document-scoped switching

Status: accepted, amended by ADRs 0008 and 0009, 2026-11-12.

Saving and connecting are separate operations. Every profile is identified by
`(instance id, authentication view)` and connects through an explicit
`/mygo-instance/<route>/` document. There is no seed or privileged default.

Switching reloads the document. The selected Host supplies its original client
graph, RPC, assets and WebSocket transport to one fresh Cordis Context and Loader.
Separate tabs retain independent routes. A route never falls back to another Host.

The reverse proxy validates its public edge, rewrites requests to the selected
native authority and injects only that profile's stored DSH credential. The
credential never enters browser JavaScript. Original DSH admission, Peer and
Gateway authorization remain in force; mygo's own user authority is separate.

Profiles contain only a validated HTTP(S) origin. Tokens and Host cookies live in
private server storage keyed by the same composite identity. A changed address
retains the token, discards the authority-bound cookie and performs a new native
exchange. The latest saved profile retires earlier routes for that same identity;
unrelated instances and authentication views remain independent.

Original remote localStorage/sessionStorage are namespaced by instance, origin
and authentication view. Mygo owns the catalog and local plugin preferences.
These namespaces prevent accidental state mixing; they are not a sandbox for
trusted same-realm plugin code.
