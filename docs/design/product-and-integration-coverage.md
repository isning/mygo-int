# Product and integration coverage

Status: reference design coverage, 2026-11-09. This is not an implementation checklist
claimed complete. The requested baseline remains dsh-go's remote-client experience.
Architecture choices do not silently remove product requirements.

## 1. Evidence and comparison unit

Baseline source: dsh-go `2432cbdcc92f4a2ced6e8ffeba648af0f832eb98` (2026-11-08).
DSH source: `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159` (2026-11-04).
Compare user-visible workflows by host version, carrier and capability, not only by
application version or a single supports-DSH flag.

Pinned guide contradictions exist: chat guidance describes file upload on capable
Remote hosts, while the host guide still says Remote only accepts images. Preserve
this as a documentation conflict. The design negotiates actual upload support; it
does not infer that either prose establishes every deployed host's behavior.

No source documentation inventory proves UI responsiveness, implementation correctness,
or exhaustive parity. Undocumented details remain audit items rather than being dropped.

## 2. Remote workflow coverage

### Connections and workspaces

Saved remote hosts, authentication, target identity verification, carrier/path status,
workspace selection and recovery map to catalog, carrier and integration contracts.
Both PC and Android use the same logical connection identities with device-local
credentials and view state. Remote identity changes block automatic queue reuse.

### Conversation browsing and organization

New conversations, history, running/pending/unread filters, search, rename, pin,
folders, archive/restore and deletion map to conversation profile capabilities.
Destructive changes and bulk partial results remain explicit operations with current
remote context. Do not reinterpret unsupported delete as archive.

### Composer and execution control

Text, images/files, model/thinking selection, slash commands, references, planning,
interjection, interrupt-and-send and remote queueing map to independently declared
composer/control capabilities. Provider-specific send modes retain their semantics.
Local offline queueing is visually and contractually distinct from remote turn queues.
Stop/cancel is online state-sensitive, not a stale replay item.

### Tool and subagent visibility

Tool-call identity, input/output, status, errors, related files/diffs, expansion and
streaming map to tool activity sources and native components. Preserve full raw
available data behind readable summaries. Indicate truncated or unavailable history.
Subagent relationships, task/status, details and supported controls map to an agent
relationship profile or integration-specific pages. Unknown state is not completed.

The profile does not manufacture provider-private reasoning or unavailable outputs.
If a compact-history transport omitted details, show that fidelity explicitly and
offer a higher-fidelity source only when the host actually provides it.

### Requests and permissions

Questions, tool approvals, permission state and task-specific confirmation use the
request/configuration profiles. Display the connected target and effective scope.
Do not copy grants from one connection, device or request into another implicitly.

### Models and configuration

Model/channel selection, thinking options, provider login where offered, host defaults,
plugin settings and schema-derived forms are integration configuration capabilities.
Read/write/secret-reference/read-only metadata are distinct. Save acknowledgement
means confirmed host revision, not merely successful local control changes.

### Files, media and voice

Attachments, code/image/video viewing, save/share, file references and speech input
use platform resources plus host capabilities. Voice capture/transcription is a
platform/plugin service feeding the same draft. Generation is a remote feature,
not implied by attachment support. Resource owner, target and local-versus-remote
location are always explicit.

### Branching and message actions

Copy, selection, quote, edit/resend, regenerate, fork and return-to-original map to
message/conversation actions. An adapter advertises whether operations mutate or
create another conversation. The UI follows that behavior rather than imposing one
universal regeneration model.

### Export, share and replay

Local export and OS share can work from cached data with a declared fidelity level.
Published links need a separate share-provider plugin; they do not imply a mandatory
mygo central server. Provider-managed encrypted sharing must declare its own trust,
retention, revocation and key semantics. Replay is a read-only snapshot, not a live
session or recovered workspace. Continue-from-replay creates a new authorized task.

### Notifications and appearance

Completion/error/request notifications subscribe to integration state through a
platform notification service. No claim of permanent background connectivity or
push delivery without OS/provider support. Theme, text size, language and shortcuts
are application settings, propagated to native and Web content.
Pet/overlay/icon customization can be optional platform/UI plugins; original assets
are not assumed reusable. These baseline features remain visible in scope inventory,
not automatically included/excluded by choosing Compose.

### Plugins, bots and specialized features

Distinguish installed mygo client plugins from remote harness plugins. Their package
source, execution location, target and grants differ. Remote install/update/toggle
requires actual host support and explicit target context; a generated command is a
manual alternative, not proof that an install completed.

DS Bot, image/video generation, automation, goals and future managed environments
are optional remote feature profiles or dedicated integration pages. Advertise and
render them where available; absence in ACP is not solved by a generic chat renderer.
Do not require every feature to be normalized before supporting it.

## 3. Product exclusions already grounded in the conversation

The initial client uses remote agents. Bundled Android Linux/DSH environments and
phone automation are not inferred from dsh-go parity; the user explicitly deferred
an integrated agent core. A managed-agent provisioning platform and central service
are future directions. This leaves their client extension points intact.

No additional feature is removed merely to simplify the architecture. Release
prioritization or a departure from remote-client parity needs a separate product
decision; the reference design supplies homes for all listed capabilities.

## 4. Integration capability model

Each capability reports supported/unsupported/unknown, applicable scope, version,
constraints, fidelity and reason. Runtime readiness/authorization are separate from
static support. Feature actions also report current enabled state and explanation.

For each target, derive an effective capability from application, platform, carrier,
integration, remote host and grants. The UI may hide irrelevant optional decoration,
but should explain unavailable core workflow outcomes where the user expects them.

Never treat these as equivalent: DSH protocol support, dsh-go native bridge support,
DSH browser plugin support, mygo semantic-page support, and MCP Apps support.

## Sources

- [Chat](https://github.com/ccch1mneyyy/dsh-Go/blob/2432cbdcc92f4a2ced6e8ffeba648af0f832eb98/docs/guide/zh/01-chat.md).
- [Models](https://github.com/ccch1mneyyy/dsh-Go/blob/2432cbdcc92f4a2ced6e8ffeba648af0f832eb98/docs/guide/zh/02-models.md).
- [Hosts](https://github.com/ccch1mneyyy/dsh-Go/blob/2432cbdcc92f4a2ced6e8ffeba648af0f832eb98/docs/guide/zh/03-engine-hosts.md).
- [Web mode](https://github.com/ccch1mneyyy/dsh-Go/blob/2432cbdcc92f4a2ced6e8ffeba648af0f832eb98/docs/guide/zh/05-web.md).
- [Sharing](https://github.com/ccch1mneyyy/dsh-Go/blob/2432cbdcc92f4a2ced6e8ffeba648af0f832eb98/docs/guide/zh/07-sharing.md).
- [Plugins](https://github.com/ccch1mneyyy/dsh-Go/blob/2432cbdcc92f4a2ced6e8ffeba648af0f832eb98/docs/guide/zh/08-plugins.md).
- [Appearance](https://github.com/ccch1mneyyy/dsh-Go/blob/2432cbdcc92f4a2ced6e8ffeba648af0f832eb98/docs/guide/zh/09-appearance.md).
- [Settings](https://github.com/ccch1mneyyy/dsh-Go/blob/2432cbdcc92f4a2ced6e8ffeba648af0f832eb98/docs/guide/zh/10-settings.md).
- [Bots](https://github.com/ccch1mneyyy/dsh-Go/blob/2432cbdcc92f4a2ced6e8ffeba648af0f832eb98/docs/guide/zh/12-bots.md).
