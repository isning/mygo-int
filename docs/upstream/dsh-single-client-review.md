# Single-client composition review

Baseline: `5327f0fc02a1771d21a04bccdf0615e997a556f4`, confirmed by the user.
Comparison: `git diff 5327f0fc02a1771d21a04bccdf0615e997a556f4...HEAD`.
The first parallel review covered implementation through `a912ff3`; the second
covered the domain documentation and correction through `907a6cf`.
Specification: `docs/specs/mygo-single-client-composition.md`, tickets 47–60.

## Standards

No hard documented-rule violations were identified in either review round.
CONTEXT and accepted ADR 0004 record the architectural decision as required by
`docs/agents/domain.md`.

Two optional Duplicated Code heuristics remain:

- Preparation scripts repeat relocation transformations, such as
  `startup.replaceAll("from './", …)`. A shared preparation helper could reduce
  maintenance across the unified and instance acceptance fixtures.
- Browser acceptance scripts repeat CDP request/evaluation helpers, including
  `const send = (method, params = {}) => new Promise(…)`. A shared session helper
  could reduce future fixes across scenarios.

These are judgment calls, not standard violations. Both refactors are deferred
to keep this implementation focused; the second reviewer agreed that deferral
is reasonable. No additional material standards issue was found.

## Spec

The first review found one P2: the unified Plugins inventory replaced original
Remote errors with a generic message, contrary to the requirement to distinguish
transport and permission failures. Commit `907a6cf` preserves original code,
message and details in both failed-result and rejected-call paths, with explicit
authentication/permission, transport and other Remote failure labels.

The parent reproduced the failure through the complete browser and real Host,
then verified the correction with a blocked request and a cleared browser cookie.
The second reviewer confirmed the P2 resolved and found no new material issue or
scope creep. That review also ran six direct diagnostic-formatting checks; it
did not independently rerun the browser/build workflows.

## Verification and handoff

The integrated implementation passed 8 original artifact gates, the original Web
typecheck and complete browser acceptance described in
[the default-client record](dsh-default-client.md). After the correction, the
parent rebuilt the adapted client, passed all 27 repository tests, and reran
single-root startup plus original session submission and durable MODEL MOCK reply.
There is no adapter-wide semantic TSX/checkJs checker; original Web typechecking
does not imply one.

The corrected parent-owned demo is `http://100.97.207.47:4224/`, listening on
`0.0.0.0`. Original DSH authentication remains required. Open it privately from
the repository with `node scripts/dsh-test-host.mjs open`; the launch entry is
`.scratch/test-dsh/client-launch-url` with mode `0600`. No credential is published.
Inference uses MODEL MOCK. Another physical device's routing was not tested.

Standards: 0 hard findings, 2 optional duplication recommendations.
Spec: 1 P2 resolved, 0 outstanding findings.
