# Historical context before wayfinding

Status: historical proposal material, not current scope authority.
The confirmed project definition takes precedence.

# mygo domain context

## Confirmed product direction

mygo is a general-purpose harness client for PC and Android. Both platforms
provide complete interaction capabilities, with navigation adapted to each device.
The initial functional and interaction baseline is dsh-go's remote-client experience.
Visibility into tool calls and subagents, and responsive interaction, are central goals.

Agents initially run remotely, including on the user's own PC. Managed isolated
agents and an integrated agent core are future directions. A central server is
not a prerequisite for the client design.

## Confirmed architecture direction

Cordis is the client foundation: plugins provide harness support and client
capabilities. DSH is an integration, not the universal business model.
Adding another harness should be possible through corresponding client plugins.

The application provides platform services and presentation infrastructure.
Harness plugins own their harness-specific connection and business logic.
Existing DSH client logic should be reused where compatible rather than duplicated
in platform code. Other harnesses do not have to implement DSH's internal models.

Plugin presentation should express page semantics rather than fixed desktop or
mobile navigation. The host chooses navigation and layout for the device.
Native containers and freely implemented Web content are design interests;
their exact protocol and first-release support remain undecided.

## Terminology

- Client runtime: the on-device Cordis environment hosting client plugins.
- Platform service: an OS-facing capability exposed to the runtime.
- Harness integration: plugins connecting the client to a particular harness.
- Connection: a configured remote target and its associated integration scope.
- Presentation host: the implementation that renders pages and manages navigation.
- Rendering face: a plugin's presentation implementation for a particular renderer.

## Current design phase

Complete the theoretical architecture before implementation or runtime experiments.
Distinguish confirmed requirements, proposed contracts, and unverified assumptions.
The supplied Android/DSH feasibility exploration is source-reading evidence reported
by the user, not a runtime validation or an adopted design in its entirety.

## Completed theoretical design proposal

The reference design now covers bootstrap and manifests, connection-generation realms,
service ownership, plugin authoring, semantic navigation, native/Web rendering,
durable operations, persistence, upgrades, failure behavior, and DSH/ACP integration.
It recommends Kotlin/Compose platform hosts and a replaceable embeddable JS engine
port, with QuickJS as a reference candidate. These are recommendations, not approved
implementation commitments or runtime validation.

The platform-independent architecture does not depend on these exact libraries.
Shipping OS coverage, measured engine/toolkit suitability, trust/distribution policy,
and release-by-release compatibility remain product or implementation decisions.

Prefer the completed reasoning and protocol specification over earlier illustrative
examples if their details differ. Do not silently replace confirmed product scope
with a narrower implementation baseline.

See `docs/design/client-architecture.md` for the evolving architecture proposal.
