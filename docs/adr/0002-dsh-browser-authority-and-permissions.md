# Preserve DSH browser authority and permissions

Status: accepted, amended by ADRs 0007 and 0008, 2026-11-12.

Mygo forwards one profile's stored native DSH credential only on that profile's
explicit route. It preserves the public Host, Origin and Fetch metadata at the
edge, then uses the selected DSH authority upstream. Original DSH admission,
Peer, Gateway and RemoteAccess checks remain authoritative.

The reverse proxy owns topology, transport bounds, credential custody and normal
shutdown. It does not add a business-method allowlist, mint principals, bypass
TLS, expose credentials to browser JavaScript or treat Host/Origin as identity.
Mygo user authentication is a separate outer boundary.

The pinned browser launch flow grants the native owner role. `/connect` also
creates an owner operator. Restricted browser identities require a supported
identity mechanism and must not be simulated with an owner credential.
