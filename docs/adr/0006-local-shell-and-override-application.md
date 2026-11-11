# Local UI survives instance unavailability; override is an application mode

Status: accepted, 2026-11-11. Amends ADRs 0002/0003/0005.

A device must retain navigation and Instances settings without a connected or
authenticated DSH. The local shell starts before remote bootstrap and starts the
existing local composition/catalog services in the same original Loader. These
concrete entries are reused after connection; no duplicate services are created.
Existing device-overlay baselines remain unchanged.

The local shell reuses original controls, theme styles, Instances forms and
SettingsPanel. It owns a temporary React mount in the same application container.
Before the original remote renderer mounts, that local mount is explicitly
unmounted. These are sequential presentation owners, never parallel application
roots or separate Cordis trees. Once remote UI is active its existing connection
recovery remains in charge; local catalog/settings services stay alive.

An instance preparation failure is recoverable: retain the root and local services,
show its original error and keep Instances accessible. Retry currently reloads the
page, which also resets the original one-shot module bootstrap. Additional profile
selection still saves a preference; it does not retarget the fixed carrier.

The clean application document is local static UI, served without asking the Host
for admission. Public Host/Origin checks still apply. Token-exchange query URLs
are still forwarded to original DSH authentication. Remote APIs, bootstrap data,
status and WebSocket admission remain protected by the original browser credential;
serving a local shell does not grant a Peer or bypass Remote permissions.
Device-local storage writes no longer require remote admission. They retain local
revision/conflict checks and never become Host mutations.

Override is not a central plugin. A local bootstrap descriptor may declare
`mode: "override"` and `target: "@scope/remote-package"`. Its ordinary module
namespace is selected for that package and its `/client` alias before the original
module system captures the seed table. It does not run as an extra local Entry;
the instance's original managed Entry invokes it if that remote package is present.
Absent remote entries are not synthesized. Duplicate targets and attempts to
replace platform singleton seeds are rejected. Current selections are startup
configuration; changing them requires reload. This is not sandbox isolation.

The old central `client-overrides` module is removed. The local shell owns local
UI namespace availability; the plugin-manager replacement is an ordinary module
applied to its explicit remote target. All other official client feature entries
continue to come from the instance manifest.
