<img src="assets/icon.svg" width="64" height="64" alt="">

# mygo

A general-purpose harness client for PC and Android, built on Cordis.

Project definition, architecture and implementation route are confirmed.
No client implementation is present.

The implementation starting point is an independent extraction of DSH's official
React/Cordis client with near-total code reuse, followed by client/remote plugin
contracts and compatibility. Native/headless rendering is not an extraction prerequisite.

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
confirmed decisions take precedence.

- [Wayfinder decision map](https://github.com/isning/mygo-int/issues/1)

Created in [T3 Code](https://t3.codes).
