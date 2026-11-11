# Explicit instance routes and full-document connection switching

Status: accepted, 2026-11-11. Amends the fixed-carrier limitations in ADRs
0002/0006; preserves one client Context/Loader per document.

Saving a profile and connecting to it are separate operations. Every profile,
including the seeded profile, can connect through Settings or the sidebar menu.
The instance plugin registers a validated HTTP(S) target with the local carrier,
then navigates to its explicit `/mygo-instance/<route>/` document. Each document
loads its selected Host's bootstrap, original client plugins, RPC, assets and
WebSocket transport. The base and original upstream runtime remain unchanged.

Switching reloads the page. The previous document and its socket are closed;
the new document owns one fresh Cordis root and original Loader. Local plugin
configuration persists and is reapplied, but local Entry/fiber identities are
not retained across navigation. This avoids hot replacement of the original
one-shot module facade and mixed Host singletons. It does not implement several
concurrent Host trees in one document. Separate tabs keep independent explicit
routes; no global mutable active-target cookie can redirect another tab's calls.

The local carrier validates public Host/Origin before translating upstream
Host/Origin to the selected target's native authority. It filters forwarded
headers and injects only that profile's original, Host-issued DSH credential.
The credential remains in the mygo reverse proxy and is never sent to browser
JavaScript or browser cookies. The native Host still signs/verifies it and
performs original Peer/Gateway authorization. There is no business method
allowlist, synthesized principal or disabled TLS verification. Mygo's own user
authentication and authorization are a separate outer boundary; the current
personal-client fixture does not define that system. A native owner launch token
still grants the native owner role, not a new restricted-user mechanism.

Target registration requires a same-origin JSON POST, bounded payload and a
validated credential-free origin. Paths, tokens, redirects-as-targets and other
schemes are rejected. Registered route metadata is persisted in private scratch
storage so normal carrier restart can restore route URLs. A stale/unreachable
Host never silently falls back to another Host. Bootstrap refusal/unavailability
keeps the local shell and Instances settings usable for login or switching back.
Unknown route identities fail explicitly.

The offline login form accepts the target's private launch link or token and
exchanges it through original DSH token authentication. After a successful
exchange, mygo stores the token and Host-issued cookie in its private credential
file, keyed by the exact instance, origin and authentication view. A later 401
can repeat the native exchange without asking for the link again. The token is
never placed in the profile catalog, browser storage, route URL after exchange,
logs or client response, and another instance cannot select it. The carrier
returns the original refusal status. Existing direct launch links are
intercepted, saved and redirected to a token-free route.

Device preferences/catalog use the stable device seed namespace. Original
remote localStorage/sessionStorage are namespaced by instance/origin/authentication
view before client modules materialize. Old device services capture their own
storage handle before that boundary. This avoids accidental cache mixing and
remote `Storage.clear()` deleting device preferences. These wrappers are not a
security sandbox for arbitrary same-realm JavaScript. Storage-event translation,
legacy native storage-prototype tricks and general HTML resource interception
are not promised by this adapter; the pinned original DSH workflows are verified.

Validation uses two real pinned DSH Hosts with the existing HTTP model mock:
Settings connect, separate login/refusal, Host-specific session lists, original
composer reply, namespaced cache, retained local plugin preferences, sidebar
return with retained authentication and recovery from an unavailable target.
Carrier TCP tests verify that a disconnected upgraded client closes its upstream
socket. They also ensure another tab's route remains unchanged and cross-site
registration is rejected. Chrome does not consistently report the old document's
WebSocketClosed event after navigation, so the browser proof does not claim that
event as a measured teardown signal.
