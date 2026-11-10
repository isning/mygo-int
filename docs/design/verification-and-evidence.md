# Lightweight acceptance

Status: confirmed by the user, 2026-11-10: keep acceptance simple; get it running.
This replaces the earlier extensive verification-gate proposal. No client build,
launch or interaction has been performed in this planning effort.

## Current completion check

For the initial official React extraction work, demonstrate that the independent
client starts, connects to the intended DSH and supports a basic session interaction:
open a session, send a message and receive the response. Check failures encountered
while getting that path working. Forwarding the original served page alone is not
proof that the extracted independent client booted.

This is a small practical smoke check, not a mandatory automated suite. Use existing
upstream checks where appropriate to a change, without constructing a comprehensive
new test system before making the client usable.

## As implementation expands

For an implemented capability, check its basic behavior in the environment actually
used. Native rendering, additional platforms, multiple instances and offline replay
are checked when those capabilities are implemented. Their full matrices, fault
injection, accessibility audits and performance benchmarks are not prerequisites
for getting the React client running.

Keep the already-confirmed architecture boundaries: code ownership, authority,
compatible module identities and safe replay semantics. Simplifying acceptance does
not make a broken connection or fabricated success acceptable, but it does not
require a separate elaborate assurance process.

## Reporting

State what was launched, connected and tried, with actual results and known failures.
Do not claim untried platforms, native backends or all community plugins are verified.
Planning completion is not software completion. No automatic code-quality scoring,
resource-budget program or formal evidence hierarchy is required by this plan.
