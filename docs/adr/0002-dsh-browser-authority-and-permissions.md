# DSH browser authority and permissions

Status: accepted for the extracted official Web composition, 2026-11-10.

The scoped demonstration carrier refused legitimate original UI calls such as
`session/create`. Extending endpoint allowlists would duplicate DSH policy, while
removing them with a server owner cookie would grant owner access anonymously.

Use a fixed-target, authority-preserving transport and original DSH browser login.
Preserve Host/Origin through the original trusted-host admission. Transport only
the browser's authority-bound DSH cookie; never fall back to launcher credentials.
DSH decides Peer/principal, Remote action/resource permissions and exact-route
access. The carrier owns topology, transport bounds and shutdown, not business
method authorization. Keep original protocol envelopes and socket streams intact.

The current pinned browser login exposes the owner authentication view only.
Independent operators from `/connect` are also owner. Non-owner browser admission
requires a separately supported identity mechanism, not a local owner substitution.
The original public in-process Peer interfaces remain useful for permission tests.

This serves one selected instance/authentication view per browser composition and
retains local Cordis shell/entry ownership. Multi-instance authority domains and
non-owner browser login remain separate integration work. Historical scoped
carriers stay as fixtures, excluded from the active startup path. See
[the operational contract](../upstream/dsh-browser-auth-validation.md).
