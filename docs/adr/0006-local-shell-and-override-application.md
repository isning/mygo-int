# Local UI survives instance unavailability; override is an application mode

Status: accepted, amended by ADRs 0007–0009, 2026-11-12.

Mygo retains navigation, Settings and instance management without a connected
DSH. The local shell and local services use the same Cordis Context and Loader
that later host instance client entries. Before the remote renderer mounts, the
temporary local React mount is unmounted. There are never two Cordis trees.

An unavailable instance keeps the local shell usable. Retry reloads the document
and selecting another profile navigates to that profile's explicit route. Remote
bootstrap, RPC, assets and WebSockets remain protected by the selected DSH's
native admission and permissions. Mygo-local configuration is a separate
authority and never becomes a Host mutation.

Override is an application mode on a local bootstrap descriptor. A descriptor
with `mode: "override"` and a target replaces that target's module namespace and
`/client` alias before the original module system captures its seed table. It is
not an extra Entry, does not synthesize an absent remote plugin and cannot replace
platform singleton seeds. The default composition currently has no override entry;
the mechanism remains available for a local plugin that actually replaces a remote
client half.
