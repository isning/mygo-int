# Instance plugins load the official client composition

Status: accepted, 2026-11-11.

mygo is a Cordis application. Its base creates one Context, installs the original
Cordis Loader and loads device startup entries. It does not contain a fixed DSH
chat/session/settings composition or instantiate the official AppWebEntry. An
empty local composition can start without a DSH Host or renderer.

Keep the existing DSH Web build/platform infrastructure. A small Web entry calls
the base; this still replaces the Web main at build time. We do not claim the
original main is a plugin or unchanged in the emitted mygo application. Upstream
sources are not patched on disk. Avoid a second standalone HTML/build platform.

The default local bootstrap contains `dsh-instance` and `client-overrides`, using
ordinary module exports, `inject`, `apply` and original Loader Entry options. This
is not a second plugin SDK. Existing local feature entries remain device plugins.
The bootstrap stage exists to establish the module carrier and local override
namespaces before loading the instance graph; it is not a separate Cordis tree.

`dsh-instance` consumes the existing original module-loader facade, transport hooks,
remote manifest and `ClientEntries.start` on the base's existing Loader. Official
feature entries come only from that instance manifest, not a locally duplicated
list. Original activation audit and renderer mount helpers are reused. Remote
reconciliation cannot claim the configured local module names.

`client-overrides` registers local UI namespaces and the explicit plugin-manager
client-half override before the original module system captures its seed table.
It does not install another official UI roster. Original React/Cordis and UI
primitives are shared compatibility libraries, not locally activated feature
plugins. Loading shared libraries does not grant an Entry or a management authority.

The base exposes `clientHost` (existing root, mount container, configuration,
module seeds and local ownership set). A bootstrap plugin may provide `clientRuntime`
with prepare/mount/fail/dispose hooks. Preparation completes before local features
are activated; mounting follows activation. Bootstrap plugins finish synchronous
service registration before hooks execute, avoiding waiting on their own Loader
activation. This is an internal composition seam, not an upstream Cordis contract.

Local startup/configuration changes remain local. Host status/bootstrap HTTP and
credential carriage retain ADR 0002. No Host plugins or settings are removed or
reconfigured by trimming the local client. Existing source-scoped lifecycle and
device persistence rules of ADRs 0003/0004 remain in effect. The feature-entry list
is unchanged, so existing exact device overlay baselines remain valid.
