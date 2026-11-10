# Complete product workflows

Status: historical product-workflow discussion, superseded as a planning focus by
the user's extraction-first architecture direction. Retain it as illustrative
integration/contract scenarios, not an independently required product specification.
Original discussion:
[Define complete workflows and cross-platform completion criteria](https://github.com/isning/mygo-int/issues/3).
This plans the complete product, not a release slice or an implemented acceptance
report. Unanswered product choices remain explicitly open.

## Basis

The client is a local Cordis plugin composition on a minimal base. Its default
composition covers dsh-go's remote-client workflows while allowing harness extensions.
Linux, Windows, macOS and Android provide complete applicable interaction with
adapted layout, navigation, input and accessibility. The feature inventory remains
in `product-and-integration-coverage.md`; this document defines user outcomes.

## W01. Connect and revisit instances

Select an integration, authenticate, identify a remote instance and workspace, and
return later without mixing another instance's state. Multiple instances stay
connected; switching the visible instance preserves others' tasks, pages and state.

Completion: identity changes differ from ordinary connection loss; failures are
actionable; changing the active page cannot retarget an operation.

## W02. Start and continue tasks

Compose text and supported attachments, choose offered model/options, submit and
follow streaming replies. Interjection, queue and interrupt modes retain their actual
harness semantics. Pending, accepted and finished are distinct outcomes.

Completion: recoverable failure preserves input; attachment failure cannot silently
submit a different request; stop outcomes and unavailable capabilities are truthful.

## W03. Inspect tools

Expand activity to inspect available inputs, output, status, errors, files/diffs and
raw details. Large results remain accessible through incremental reads or search
without freezing the conversation or displacing a user reading older activity.

Completion: summaries preserve access to available details. Truncation, compact history
and missing data are labelled. Collapsing/virtualizing rows cannot change call identity.

## W04. Follow subagents

See parent/child relationships, assigned work, state and available results; open a
child's activity and return to the parent. Harness-supported controls remain reachable.

Completion: unknown state is not fabricated. Opening a child preserves parent context;
closing a view does not stop execution or disconnect unrelated instances.

## W05. Answer requests

Inspect canonical question/approval target and scope, respond, and see remote acceptance.
Another device may resolve the request first. Renderer choice does not change authority.

Completion: stale answers cannot target newer requests; offline/expired requests cannot
pretend success; permission state is not silently copied across instances.

## W06. Find and organize work

Search/filter conversations; rename, pin, group, archive/restore or delete as supported.
Copy, quote, edit/resend, regenerate and branch messages with provider-defined semantics.

Completion: branches retain a return path; unsupported deletion is not converted into
archive; bulk actions retain per-item failures and unknown outcomes.

## W07. Configure capabilities and plugins

Distinguish local client plugins from remote harness plugins, identify the installation
target, and edit offered settings/model/provider options. Existing DSH Web plugins have
a compatibility route; mygo semantic contributions adapt to platform navigation.

Completion: saved, applied, read-only and restart-required are distinct. Conflicts
preserve edits. A setting is saved only after its authoritative store/host acknowledges it.

## W08. Work with artifacts and share results

Preview supported files/media/code/diffs, retrieve resources and export/share selected
content. A replay is a read-only artifact; continuing from it creates a new task rather
than restoring hidden execution state. Interactive terminal scope is pending Q10.

Completion: paths and fidelity are explicit; share preview shows what leaves the device.
Share providers are plugins, not a mandatory central mygo dependency.

## W09. Recover after interruption

Reopen available work after suspension, connection loss or process recreation. Distinguish
cached reading, drafts, queued operations, unknown outcomes and live task state.
Cross-device unsent-state requirements remain pending Q9.

Completion: acknowledged saved data survives the declared failure model. Lost receipts
do not generate new submissions. Unsupported replay remains a draft/manual recovery
path; client retry alone never establishes exactly-once execution.

## W10. Adapt the client

Use complete workflows on keyboard/mouse PC and touch Android; adjust theme/text/language
and replace supported local plugins. Resource identity and instance ownership survive
layout changes. The base itself does not own these product policies.

Completion: required outcomes do not need desktop-only gestures. Keyboard navigation,
screen-reader semantics, scaling, selection and IME are product requirements. Replacing
presentation does not duplicate business state. Out-of-app notification scope is pending Q11.

## Cross-cutting completion criteria

- State truth: live, cached, pending, partial, unavailable and failed are distinguishable.
- Input continuity: streaming/tool updates cannot overwrite newer drafts, break IME,
  unexpectedly move focus or block immediate editing.
- Reading continuity: preserve scroll/selection and show explicit new-output indicators.
- Bounded cost: long history and large output use incremental access; one task update
  does not require repainting all connected instances.
- Recovery: protect acknowledged drafts and unresolved operations; expose scoped failure
  and a valid exit/recovery path.
- Capability honesty: reflect actual platform/carrier/integration/host support and
  preserve provider-specific features instead of flattening them away.
- Cross-platform equivalence: same applicable outcomes with platform-appropriate controls.

Concrete workload datasets, reference devices and numeric performance thresholds belong
to the verification decision. No benchmark or product test result is claimed here.

## Subsequent user clarification

- Cross-device unsent state follows DSH's actual capabilities; do not invent another
  sync requirement or keep asking product questions about it.
- File/diff access and interactive terminals are supported architectural scenarios.
- Out-of-app notifications are a supported architectural scenario; delivery still
  depends on the actual platform and provider mechanisms.
- The work is client architecture, not an independent detailed product roadmap.
- The first implementation step extracts DSH's React client using almost all its
  existing code, then builds out client/remote plugins and compatibility.
