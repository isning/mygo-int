# Start mygo without an implicit harness instance

Status: accepted, 2026-11-12. Amends ADRs 0005 and 0007.

mygo starts one local Cordis Context and Loader without requiring `DSH_ORIGIN` or
an installed harness. The root document loads the local shell, instance catalog
and client settings. Entries whose declared services are supplied only by a
connected harness remain pending under the original Cordis lifecycle; their
absence is not a failed local startup.

Every instance, including development fixtures, is registered through the same
`POST /mygo-local/connection` interface. Registration returns an explicit
`/mygo-instance/<route>/` document. Only that document receives the selected
instance in its startup configuration and may load the instance client graph.
There is no deployment-provided seed, privileged default route or unscoped DSH
fallback. A test runner may register its temporary Host after both processes are
ready, but it uses the production interface and owns no additional capability.

The DSH integration stays at three explicit seams:

1. `dsh-instance` implements the harness-integration plugin against the existing
   mygo Context and Loader.
2. The mygo instance router supplies HTTP, WebSocket and credential carriage for
   an explicit DSH route while the original Host performs admission and Remote
   authorization.
3. `dsh-host-status` supplies the missing authenticated boot-manifest endpoint as
   a thin Host plugin.

The pinned DSH checkout remains byte-pristine. mygo uses the original Web build
configuration and replaces its browser main with the mygo base entry; it does not
patch the checkout. The remaining build-time source adaptation of the Plugins
page is compatibility debt. It must stay isolated and pin-checked until DSH
exports an equivalent tab-navigation/configuration face; it must not spread into
other DSH packages.

Legacy two-root fixtures and historical validation scripts are evidence, not the
product architecture. ADR 0009 removes their selectable build and launcher path.
They can be removed after their retained migration fixtures are converted to
focused tests.
