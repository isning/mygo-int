# Keep one product startup path

Status: accepted, 2026-11-12.

## Context

The implementation retained a selectable `legacy` composition beside the current
single-root client. That switch reached the Web build, HTTP launcher and browser
acceptance runner. It made historical two-root scaffolding look like a supported
product architecture and kept special `DSH_ORIGIN` provisioning alive after mygo
had adopted explicit, equal instance registration.

## Decision

The product has one startup path:

1. Build the mygo Web base with the pinned DSH Vite configuration and platform
   modules.
2. Start one local Cordis Context and Loader with no selected harness.
3. Register every harness through the instance interface.
4. Load a DSH client graph only inside that instance's explicit route.

The launcher and build do not interpret `MYGO_CLIENT_COMPOSITION`, build a second
output directory, accept an implicit `DSH_ORIGIN`, or provision a special connected
profile. The historical two-root sources and scenario scripts have been removed.

## DSH seams

The pinned DSH checkout remains unmodified. Integration is limited to:

- platform reuse: Cordis, Loader, React, Slot and the official Web build graph;
- the `dsh-instance` client plugin, which attaches an instance manifest to the
  existing Loader;
- the mygo instance carrier, which owns routing and credentials while preserving
  DSH admission and Remote authorization;
- the thin `dsh-host-bootstrap` Host plugin for authenticated boot metadata;
- one isolated, pin-checked Plugins compatibility adapter that exposes pinned
  presentation functions; the original page, navigation and tab behaviour are
  unchanged.

Direct imports from pinned DSH source are compatibility dependencies, not edits to
DSH. New product behavior belongs in mygo plugins. A new source transform requires
another architecture decision.

## Consequences

There is no supported fallback composition. A failed instance leaves the local
shell running and reports the connection error. The product build is easier to
reason about because instance behavior can no longer differ by an environment
selected architecture.
