# React mechanisms for native and Web plugin presentation

Research date: 2026-11-10. Decision context: [project definition](../design/project-definition.md).
This note resolves the source-reading question in [查明标准 React 驱动原生与 Web 混合界面的可复用机制](https://github.com/isning/mygo-int/issues/5).
No packages were installed; no application, prototype, build or runtime experiment was run.

## Compact answer

**Fact:** Existing React infrastructure can execute ordinary function components,
hooks and handlers while producing controlled host elements: a custom reconciler,
Remote DOM with React DOM, or React Native. They supply different parts of the
pipeline; none of the inspected projects supplies a complete Cordis-to-native,
four-platform semantic-page host. See the primary sources below.

**Inference:** A plugin SDK can offer semantic components such as Page, Sections,
Collection/Detail and WebSurface using real React. Native navigation policy can
live in replaceable local plugins. However, a WebSurface API must specify where
its React children execute. An arbitrary component closure cannot simply be
serialized into another WebView. This is the central unresolved contract, rather
than a question of JSX syntax.

This note selects no architecture, component framework or product scope.

## Evidence and reusable mechanisms

### Custom React renderer

**Fact:** `react-reconciler` accepts a host configuration with instance creation,
child attachment, updates and commit behavior. Mutation and persistence modes
are available. React explicitly calls this package experimental, with a less
stable API and a different versioning scheme from normal React packages.
The host renderer is responsible for target operations, not React application
components. [React reconciler source documentation](https://github.com/facebook/react/blob/4ae637b6c352672643929bd79012c1d5c98295b3/packages/react-reconciler/README.md).

**Inference:** A mygo renderer could reconcile semantic host components into a
native-facing tree. This preserves actual React execution instead of directly
calling component functions to collect descriptors. mygo would still implement
the host configuration, native receiver, event routing, capabilities, lifecycle,
commit-to-patch translation and diagnostic tools. Neither this package nor React
provides the semantic vocabulary or Cordis integration.

### Remote DOM

**Fact:** Remote DOM synchronizes elements from an isolated JS environment to a
host. Its documented environments include iframes and workers. It provides a
minimal DOM polyfill, rather than a complete browser. The project is MIT licensed.
[Remote DOM overview](https://github.com/Shopify/remote-dom/tree/8d6504993e60433e1366624852cd5b62d20d8bfd).

**Fact:** `@remote-dom/react` uses React DOM and wraps custom elements with
`createRemoteComponent`, including callback-to-event mapping. A React-specific
polyfill must precede React DOM when using its polyfilled environment. Host-side
helpers map received elements to React components; this is not a supplied Kotlin
or Compose renderer.
[React integration](https://github.com/Shopify/remote-dom/blob/8d6504993e60433e1366624852cd5b62d20d8bfd/packages/react/README.md).

**Fact:** The core supports declared remote properties, events and methods. A
`RemoteReceiver` reconstructs a subscribable JS representation. Its documented
retain/release hooks support callback-proxy lifetime management; function transport
needs a suitable RPC layer. Batching is available.
[Core documentation](https://github.com/Shopify/remote-dom/blob/8d6504993e60433e1366624852cd5b62d20d8bfd/packages/core/README.md).

**Fact:** The polyfill implements only a subset of Window/DOM APIs. Its documented
API is not a browser layout, CSS, canvas or complete third-party DOM-library
compatibility promise.
[Polyfill documentation](https://github.com/Shopify/remote-dom/blob/8d6504993e60433e1366624852cd5b62d20d8bfd/packages/polyfill/README.md).

**Inference:** This can reuse upstream reconciliation and remote element/event
machinery for semantic components. A native host still needs an adapter or port
from the received representation into its widget system. Reusing only the wire
ideas would leave a larger custom implementation. Running genuine Web libraries
inside a real browser remains a separate capability; a minimal DOM polyfill does
not provide that freedom.

**Version fact:** At the inspected commit, `@remote-dom/react` is 1.2.3, declares
React peers `^17.0.0 || ^18.0.0`, and declares Node >=18. Its README also contains
React 19 examples, so examples alone cannot establish package compatibility.
This does not prove React 19 fails; it establishes a mismatch requiring a deliberate
version decision. [Package manifest](https://github.com/Shopify/remote-dom/blob/8d6504993e60433e1366624852cd5b62d20d8bfd/packages/react/package.json).

### React Native and Fabric

**Fact:** Fabric is a native rendering system with shared C++ machinery, host
component declarations/code generation, scheduling and JSI interaction. It is a
substantial runtime/rendering stack, not merely a JSON-to-widget interpreter.
[Fabric architecture](https://reactnative.dev/architecture/fabric-renderer).

**Fact:** React Native lists Windows and macOS implementations maintained outside
core, and community renderers including Skia for Linux/macOS. Its own documentation
says creating a new platform remains incompletely documented. This is not proof
of one homogeneous implementation covering all mygo targets.
[Out-of-tree platforms](https://reactnative.dev/docs/out-of-tree-platforms).

**Fact:** React Native WebView is community maintained, separate from RN core.
Its documentation covers HTML/URL sources, navigation and message communication.
It does not render arbitrary React children passed from RN as browser DOM.
[WebView project](https://github.com/react-native-webview/react-native-webview/tree/7b70587c0cacb285f840a2eda9d74f9621a7f142),
[WebView guide](https://github.com/react-native-webview/react-native-webview/blob/7b70587c0cacb285f840a2eda9d74f9621a7f142/docs/Guide.md).

**Inference:** RN can supply native components and WebView hosting if its platform
stack is chosen. A mygo semantic component layer, plugin lifecycle and authority
model are still necessary. Four-platform WebView/backend parity and embedding a
Cordis runtime require separate assessment; Android support alone cannot settle
them.

## Hooks, state and the Web boundary

**Fact:** Hooks run while React renders function components/custom hooks. Application
and renderer must resolve compatible React modules; duplicate React exports can
break hooks. Therefore a package loader must deliberately bind each render tree's
React imports to the renderer's matching copy.
[React hook rules and duplicate-module guidance](https://react.dev/warnings/invalid-hook-call-warning).

**Fact:** A React DOM portal targets an existing DOM node while retaining its
parent React context and event ancestry. This is a placement facility inside
React DOM, not a general transport into an independent native renderer or JS VM.
[React portal contract](https://react.dev/reference/react-dom/createPortal).

**Fact:** Structured serialization rejects callable objects. Passing callback IDs
or RPC proxies is different from transferring their code, lexical environment or
React state. [HTML structured serialization specification](https://html.spec.whatwg.org/multipage/structured-data.html#structuredserializeinternal).

**Design alternatives inferred from these facts:**

- A headless React semantic tree and separately loaded Web entrypoint can exchange
  explicit values/services. Each tree owns its hooks; context and event ancestry
  do not automatically span them. A `component={SomeClosure}` API cannot be
  implemented by ordinary serialization.
- A browser-hosted plugin can retain its actual React DOM tree and report semantic
  metadata to native. Native presentation and browser content still need explicit
  mounting, visibility, layout and lifecycle coordination. Cordis integration may
  be local or bridged. One browser document does not automatically distribute
  live DOM nodes across independent native WebViews.
- A custom renderer can represent WebSurface as an opaque resource/module entry
  and props. This offers standard React on both sides, but not an implicit single
  React tree spanning both renderers.

A one-file authoring API could hide build-time splitting, but captured values,
hook identity, effects and context would need a defined transform contract. None
of the inspected libraries establishes transparent arbitrary-closure splitting.

## Accessibility and required host behavior

**Fact:** RN exposes native accessibility labels, roles, state and focus-related
properties, with platform differences explicitly documented.
[RN accessibility](https://reactnative.dev/docs/accessibility).

**Inference:** A custom semantic receiver needs equivalent accessibility contracts,
not only visual nodes. Native/Web boundary focus, back behavior, keyboard traversal,
IME composition, announcements and restoration need explicit ownership. Remote
DOM's event transport does not settle these OS-facing semantics.

## Decisions and unknowns left for the map

1. Does standard React mean separate standard roots with explicit service sharing,
   or one continuous context/state/event tree around Web children? These are
   different guarantees.
2. Where do local UI components execute: browser, headless JS, RN runtime, or
   separate roots by surface? Where does their Cordis service access execute?
3. Which React/renderer/SDK version combination is supported, and how are plugin
   imports deduplicated or isolated? Pin the combination rather than assuming
   compatibility with latest packages.
4. Which mechanisms are reused versus ported into a native receiver? No Kotlin,
   Compose or Linux-native Remote DOM receiver was established by these sources.
5. What is the semantic component contract, including capabilities, navigation,
   errors, refs, measurements and accessibility? These are mygo design decisions.
6. Existing DSH Web-plugin compatibility additionally requires DSH's actual host
   services and module environment; the presence of React DOM or a WebView alone
   establishes no compatibility guarantee.

Performance, memory, complete React feature support, engine compatibility and
four-platform embedding behavior remain unmeasured. These unknowns do not prevent
specifying contracts, but must not be presented as source-proven runtime results.
