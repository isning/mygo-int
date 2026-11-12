<img src="assets/icon.svg" width="64" height="64" alt="">

# mygo

A general-purpose harness client for PC and Android, built on Cordis.

The current Web client starts one local Cordis composition without requiring a
harness. Saved DSH instances connect through explicit reverse-proxy routes and
supply their original client plugins, Remote services and UI. Local plugins own
the offline shell, instance management and targeted overrides. The pinned DSH
checkout remains unchanged.

Build and verification commands are documented in
[the Web client README](entries/dsh-startup/README.md).

- [Architecture overview](docs/design/architecture-overview.md)
- [Confirmed project definition](docs/design/project-definition.md)
- [Domain glossary](CONTEXT.md)
- [React client extraction route](docs/design/react-client-extraction.md)
- [Client/remote plugin contracts](docs/design/client-remote-plugin-architecture.md)
- [Unified Slot rendering](docs/design/unified-slot-rendering.md)
- [Platform carrier contract](docs/design/platform-carrier-contract.md)
- [Instance and connection model](docs/design/instance-and-connection-model.md)
- [Confirmed implementation dependency plan](docs/design/implementation-dependency-plan.md)

Earlier theoretical alternatives are retained in [architecture notes](docs/design/client-architecture.md);
accepted ADRs and the current implementation take precedence.

- [Wayfinder decision map](https://github.com/isning/mygo-int/issues/1)

Created in [T3 Code](https://t3.codes).
