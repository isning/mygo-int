# Navigation and page model

Status: superseded for native presentation by
[ADR 0010](../adr/0010-native-renderer-seam.md). Detailed restoration and authority
rules below remain useful where they do not imply a second navigation plugin.

## Domain ownership

The official navigation and feature plugins define their components, destinations and
routes through the existing Slot interface. Their GPUIX faces retain those exact
contracts. Base mechanisms expose mounts, platform back/focus/events and lifecycle
without redefining a route or an instance.

A destination identifies a plugin-defined resource/view. An occurrence represents
an open visit to that destination, potentially with its own draft/selection state.
The platform renderer maps an occurrence to desktop controls or an Android page stack
as required by the official contract. Changing physical layout is not a new visit and
must not reset the authoritative model.

Instance and authentication-view qualification belongs to routes displaying private
remote data. Display labels and path strings do not substitute for identity. A local
page can exist without any remote instance.

## Unified Slots and rendering faces

The official navigation plugin contributes layout Root and child Slots. Its native
and React faces share child declarations, navigation state and model ownership. Do
not register the same children twice merely to expose two faces.

A page can retain original Web UI as one authorized Slot surface. Native-aware pages
render the same official sections and detail relationships. Adapting physical layout
must preserve required commands and selection relationships. An opaque original Web
page does not automatically provide native navigation to its internal controls.

## State and restoration

Navigation owns destination/occurrence history and selected sections. Domain plugins
own selected resources and commands where those are business state. Draft services
or the editing plugin own explicitly persistent edits. Platform views own immediate
focus, scroll and IME composition, with restoration only where declared.

Do not persist arbitrary React component state, callback handles or DOM references.
Restore durable destination parameters and declared model/draft state after process
loss. A new runtime generation rejects callbacks from old surfaces. Different
instances/accounts do not accidentally share draft keys.

Visibility does not own connection lifetime. Each window can keep an independent
current instance/history while connection ownership follows its actual consumers.
Switching views preserves other active instances and their tasks/pages. Moving from
wide split view to narrow stack keeps logical occurrence identity where the layout
contract permits it; avoid duplicate subscriptions caused by a cosmetic remount.

## Back, close and Web history

Use one explicit arbitration path for the current foreground occurrence. A typical
policy handles active input/transient UI, then the authorized surface's local history,
then application occurrence history. Exact IME/platform dispatch ordering must match
the chosen carrier rather than assuming all back events arrive in one JS handler.

A Web surface can expose whether it can handle back through its scoped protocol.
Do not infer access to an isolated document's history by reading its DOM. Browser
navigation into another origin must revoke the old document's privileged bridge.
An application back request is not an unrestricted script-execution request.

Close/back guards can ask about unsaved edits, but must be bounded and offer an exit.
A removed or failed plugin cannot trap the application forever by withholding an
answer. External navigation and window close must use the same draft ownership rules.

## Deep links and missing capabilities

Validate route parameters through the declaring plugin and resolve instance/account
association before opening private content. A deep link does not grant connection,
authentication, plugin installation or remote operation authority. Do not put secrets
or live capability tokens in persistent route URLs.

An unavailable plugin, instance or renderer yields a controlled unavailable destination
with exit/recovery options provided by the local composition. Do not silently open
the same route against a different server or run a required operation on appearance.

## Verification obligations

Exercise instance switching, two equal resource IDs on different remotes, two windows,
wide/narrow changes, explicit Web back, IME composition, dirty draft close, plugin
removal and process restoration. Validate required actions and focus/accessibility
on chosen platforms. No checks have been run in this planning phase.
