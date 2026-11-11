# mygo domain language

mygo is a personal harness client assembled from local plugins on a minimal base.
This glossary defines domain terms; project requirements live in
`docs/design/project-definition.md`.

## Language

**Base**:
The platform foundation that hosts the client runtime, plugin lifecycle and platform
bridges without owning harness-specific or fixed client-product behavior.
The base can start without a harness integration. Instance plugins load remote
client packages into its existing Loader; local override plugins select local
implementations without starting a bundled official product composition.
A local shell keeps navigation and instance settings available without a remote
connection. Override is a plugin application mode targeting an instance package,
not a central plugin or an additional official client composition.
_Avoid_: Monolithic client core, built-in universal session manager

**Client composition**:
The set of local plugins and their configuration that together provide the client
experience, including its shell, navigation and features. In the current DSH
integration, local plugins and instance-supplied client entries share one client
Cordis Context and original Loader. Their owners and management authorities remain
distinct; the Host runs its own server-side tree.
_Avoid_: Features necessarily hard-coded into the base

**Startup configuration**:
The local selection of plugin entries and configuration used to start a client
composition; the shipped default can be replaced.
_Avoid_: A hard-coded set of mandatory client-product features

**Local plugin**:
A client-side extension participating in the client composition through declared
services, lifecycle and presentation contracts.
_Avoid_: Remote harness plugin when execution and ownership are local

**Harness integration**:
A local plugin or cooperating plugin set that gives mygo access to a particular
harness and its capabilities.
_Avoid_: DSH as the mandatory model for every harness

**Instance**:
A remote harness instance with its own sessions, workspaces and capabilities.
Several instances may remain connected concurrently while the user switches views.
_Avoid_: Client composition, service provider, network connection or JS realm as synonyms

**Connection**:
An access relationship to an instance through a selected integration and transport.
Switching the visible instance does not imply disconnecting other instances.
The current browser adapter uses an explicit route per tab. Switching within a
tab reloads that document; other tabs retain their routes. Local configuration
survives navigation while runtime Entries are recreated. See ADR 0007.
_Avoid_: Instance identity inferred solely from the current screen or URL

**Connection profile**:
A saved selection of route, endpoint and authentication used to reach an instance;
several profiles may refer to one verified or explicitly associated instance.
_Avoid_: A URL treated as durable remote identity

**Authentication view**:
The identity and access context under which an instance exposes its data and
capabilities to a client.
_Avoid_: Shared private state merely because the server is the same

**Remote harness plugin**:
An extension belonging to a connected harness, whose logic and optional client UI
follow that harness's extension system.
_Avoid_: Automatically trusted local application plugin

**Client side**:
The part of a plugin that executes in the device's client runtime, regardless of
whether its package was installed locally or supplied by an instance.
_Avoid_: Locally sourced code as a synonym for locally executing code

**Remote side**:
The part of a plugin that executes in the remote harness instance and provides
remote behavior or services to the client.
_Avoid_: Downloaded client code assumed to execute on the server

**Remote-supplied client plugin**:
A client-side contribution delivered by an instance and owned by that instance's
client composition; its execution still occurs on the device.
_Avoid_: Remote service plugin, globally trusted application plugin

**Semantic page**:
A plugin-declared page with meaningful sections, actions and navigation relationships
whose platform-specific arrangement is chosen by the presentation composition.
_Avoid_: A fixed desktop tab or mobile navigation widget

**Rendering face**:
A presentation implementation of a contribution for a particular rendering technology,
such as native components or Web content.
_Avoid_: Automatic conversion of arbitrary DOM into native controls

**Web compatibility environment**:
The browser-side host context needed to use an existing harness Web plugin, including
its required services and UI extension contracts.
_Avoid_: A standalone URL assumed to make every plugin compatible
