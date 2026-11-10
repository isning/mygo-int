# Platform host, JavaScript runtime and Web embedding facts

Research date: 2026-11-10. Decision context:
[核对四端原生宿主、JS 引擎与 Web 嵌入的技术约束](https://github.com/isning/mygo-int/issues/7).

This is primary-source, read-only research. No builds, installs, runtime probes,
benchmarks or prototypes were performed. This note does not select a final stack.
The product context is [project-definition.md](../design/project-definition.md):
a minimal Cordis base, local plugins composing client policy and UI, concurrent
remote harness instances, standard React authoring, and Linux/Windows/macOS/Android.

## Evidence boundaries

**Fact** means an explicit upstream document or source contract. **Inference** means
an architectural consequence proposed here. **Unknown** means the cited material
does not establish the required behavior for mygo.

Live documentation changes. GitHub source references below use captured commits
where practical; a default-branch commit is not a recommended release. Search
snippets occasionally differed from live GitHub files (notably Hermes build
requirements); live source takes precedence. Exact release, ABI and minimum-OS
matrices must be pinned when the stack decision is made.

## Facts: native host candidates

### Kotlin and Compose Multiplatform

**Fact.** Compose officially targets Android and desktop Windows/macOS/Linux.
Desktop targets the JVM, with hardware-accelerated rendering; the development
documentation identifies Skiko/Skia as the graphics layer. This establishes a
non-DOM rendering option, not automatic mapping of each semantic node to a WinUI,
AppKit or GTK widget.
[Platform overview](https://github.com/JetBrains/compose-multiplatform/blob/986ae65bdb403552b21f4fdaad47d9bd90cbcebc/README.md),
[rendering implementation](https://github.com/JetBrains/compose-multiplatform/blob/986ae65bdb403552b21f4fdaad47d9bd90cbcebc/compose/README.md).

**Fact.** Android's documented embedding path is `AndroidView` around `WebView`.
Its WebView navigation/scroll state and Activity-bound lifecycle need explicit
handling; keeping a WebView instance beyond its Activity is discouraged.
[Android WebView in Compose](https://developer.android.com/develop/ui/compose/migrate/interoperability-apis/wrap-webview-in-compose).

**Fact.** Desktop `SwingPanel` embeds Swing components, but default interop is
rectangular and foreground-layered. JetBrains documents experimental blending for
clipping and overlap, with limitations, and warns about nested interop glitches.
This is an interop mechanism, not a complete desktop WebView backend.
[Swing interoperability](https://kotlinlang.org/docs/multiplatform/compose-desktop-swing-interoperability.html).

**Fact.** JetBrains maintains a JCEF fork distributed with JetBrains Runtime. It
embeds Chromium in Java applications; this provides an existing browser-hosting
building block rather than proof of arbitrary Compose clipping/IME behavior.
[JCEF project](https://github.com/JetBrains/jcef/blob/fc36a1ab92fb09079b0ea92034aab981e9f59133/README.md).

### React Native

**Fact.** RN documents Windows and macOS as separately maintained out-of-tree
platforms. Its listed Linux route includes a community Skia renderer. A core RN
Android renderer does not imply a uniform four-OS platform implementation.
[RN platform catalog](https://reactnative.dev/docs/out-of-tree-platforms).

**Fact.** `react-native-webview` advertises Android, iOS, Windows and macOS support;
Linux is not in that list. The project is community maintained. Compatibility must
be checked jointly against RN architecture and each desktop port's release.
[WebView project](https://github.com/react-native-webview/react-native-webview/blob/7b70587c0cacb285f840a2eda9d74f9621a7f142/README.md).

**Inference.** RN can supply a React-to-native renderer and native-module bridge,
but mygo's Linux/Web embedding requirement still needs a deliberate platform
solution. Compose has a unified declared four-target family, but likewise needs
desktop browser integration. Neither fact establishes performance superiority.

## Facts: React authoring is distinct from the engine

**Fact.** Hooks have React-specific calling rules. A custom JSX factory that emits
descriptors alone does not implement React's component lifecycle and hooks.
[Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks).

**Fact.** React supplies `react-reconciler` for custom renderers via a host config.
Upstream explicitly describes its API as experimental and less stable than React,
React DOM or RN. Mutation/layout hooks are renderer work.
[Custom renderer contract](https://github.com/facebook/react/blob/4ae637b6c352672643929bd79012c1d5c98295b3/packages/react-reconciler/README.md).

**Inference.** A Compose host can expose semantic components through a custom React
renderer; it would own renderer version coupling and scheduling. An RN host can
reuse RN's renderer for suitable host components. Real DOM plugin content still
requires a browser renderer. Standard React syntax/hooks does not make a DOM library
portable to the semantic/native renderer, nor make React contexts or closures
implicitly transferable between JS engines.

## Facts: embeddable engines and binding layers

### QuickJS

**Fact.** QuickJS provides ES modules, host module loading, explicit pending-job
execution (`JS_ExecutePendingJob`), runtime memory and stack limits, and an interrupt
callback for execution timeouts. Its documentation says a runtime does not support
multithreaded execution internally. Bytecode is version-specific and is not a
safe input format for untrusted sources.
[Manual](https://bellard.org/quickjs/quickjs.html),
[captured C API](https://github.com/bellard/quickjs/blob/092277ac1eb2997916a8ad0c4fbf961c91180498/quickjs.h).

**Fact.** Cash App's Zipline embeds QuickJS for Kotlin/JVM and Kotlin/Native and
offers Kotlin-facing services, module downloading/caching and profiling. Its
stated development model centers Kotlin/JS, not arbitrary React/Cordis bundles.
These facilities demonstrate real host integration, not drop-in mygo compatibility.
[Zipline](https://github.com/cashapp/zipline/blob/6b8a79abc44553a5d4e653190d46686b0d0cf629/README.md).

**Unknown.** This review does not establish a single maintained QuickJS binding
with the exact desired OS/CPU matrix, debugger, module semantics and cancellation
contract. QuickJS's engine API is evidence of mechanism; a Kotlin wrapper's surface
and packaging remain separate choices. A Chrome-style inspector is not established
by the cited QuickJS API.

### Hermes

**Fact.** Hermes exposes a standalone C++ runtime and JSI. JSI forbids concurrent
runtime access and explicitly provides `queueMicrotask` and `drainMicrotasks` for
an embedder's event loop. Bounded draining is a hint, not a universal guarantee.
[Hermes runtime API](https://github.com/meta/hermes/blob/51ae2a08ce8cb06fcfa718cddab9c94ea9eee7f6/API/hermes/hermes.h),
[JSI API](https://github.com/meta/hermes/blob/51ae2a08ce8cb06fcfa718cddab9c94ea9eee7f6/API/jsi/jsi/jsi.h).

**Fact.** Source exposes a microtask configuration switch and async debugger pause.
Debugger pause is not itself a documented hard CPU deadline. Build documentation
covers Linux/macOS and Windows; the captured source also makes Intl configuration
platform-dependent. Therefore language/library availability depends on the chosen
build, not only the engine name.
[Runtime configuration](https://github.com/meta/hermes/blob/51ae2a08ce8cb06fcfa718cddab9c94ea9eee7f6/public/hermes/Public/RuntimeConfig.h),
[debugger](https://github.com/meta/hermes/blob/51ae2a08ce8cb06fcfa718cddab9c94ea9eee7f6/API/hermes/DebuggerAPI.h),
[build contract](https://github.com/meta/hermes/blob/51ae2a08ce8cb06fcfa718cddab9c94ea9eee7f6/doc/BuildingAndRunning.md).

**Unknown.** Standalone Kotlin embedding, release artifacts for all selected ABIs,
source/module loading, debugger transport, and reliable interruption policy are not
provided merely by choosing Hermes. RN's packaged integration and a custom headless
runtime are different integration scopes.

### V8 and Java bindings

**Fact.** V8 supports C++ embedding, isolates with their own heaps and separate
contexts. Its API exposes microtask checkpoints and execution termination. Inspector
support exists, but the embedder must connect inspector message transport.
[Embedding](https://v8.dev/docs/embed),
[isolate API](https://chromium.googlesource.com/v8/v8.git/+/HEAD/include/v8-isolate.h),
[Inspector integration](https://v8.dev/docs/inspector).

**Fact.** Javet offers actual JVM bindings and native artifacts for V8/Node across
Android, Linux, macOS and Windows, with an explicit architecture matrix. Its install
guide distinguishes OS, libc, Android API/ABI and native-library configuration;
four OS names are not a promise of every architecture. V8-only and Node modes are
different host environments.
[Javet project](https://github.com/caoccao/Javet/blob/5d51b4eb0bfd4869436c906ce0748b325f445959/README.rst),
[installation constraints](https://www.caoccao.com/Javet/tutorial/basic/installation.html).

**Inference.** A Kotlin/V8 integration need not start from raw JNI. It still owns
native dependency updates and platform packaging. A VM context, isolate or memory
limit is not proof of OS-level containment of malicious native code or bridge bugs.

## Facts: browser backends and surface composition

**Fact.** Wry is an existing cross-platform WebView library, using WebKitGTK on
Linux, WebKit on macOS and WebView2 on Windows, with Android integration. Its
child-WebView route is explicitly limited to macOS, Windows and Linux/X11; Wayland
requires the GTK route. It needs event-loop integration and Android Activity/JNI
setup. It is a possible backend building block, not a ready-made Compose binding.
[Wry platform and child-view contract](https://github.com/tauri-apps/wry/blob/ec9f76da91f84dfea963731b0715acbc3143a38a/README.md).

**Fact.** WebView2 distinguishes windowed and visual hosting. Windowed mode supplies
OS-managed input/focus behavior; visual hosting offers more composition control but
requires the host to forward spatial input and handle additional rendering duties.
That trade-off remains beneath any cross-platform wrapper.
[WebView2 hosting modes](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/windowed-vs-visual-hosting).

**Fact.** Android WebView provides browser functionality plus native callbacks;
JavaScript-interface calls have their own threading/security considerations and
WebView APIs are tied to the WebView thread. This is not the same execution context
as a separate Cordis engine.
[Android WebView API](https://developer.android.com/reference/android/webkit/WebView).

**Inference.** mygo needs a platform surface contract covering bounds, visibility,
focus transfer, keyboard/IME ownership, accessibility, navigation interception,
resource loading, process loss and disposal. Arbitrary rotation, clipping, nested
scrolling and native overlays above Web content cannot be promised solely because a
backend can create a child view. Separate Web and headless runtimes require explicit
message/service proxies; JSX nesting is not an implementation of that boundary.

**Unknown.** No source reviewed establishes mygo's complete IME, selection, tab-key,
popup, clipping and z-order behavior on all four platforms, particularly Linux
Wayland. This is an unresolved integration contract, not evidence of impossibility.
Neither per-WebView memory cost nor a safe maximum surface count is established.

## Facts: packaging and distribution

**Fact.** Compose's desktop packaging uses `jpackage`/`jlink`, can bundle a Java
runtime, and offers OS-specific installers and macOS signing/notarization settings.
This does not automatically package an arbitrary JS engine/browser dependency.
[Native distributions](https://kotlinlang.org/docs/multiplatform/compose-native-distribution.html).

**Fact.** Android native dependencies must account for device page sizes, including
16 KB, not just Java/Kotlin compatibility. Bundled JS engines introduce native
artifacts to that analysis.
[Android native-page compatibility](https://developer.android.com/guide/practices/page-sizes).

**Fact.** Google Play's published policy distinguishes downloaded executable native
code from code interpreted with indirect Android API access, while still requiring
runtime-loaded interpreted code to comply with policy. This is a distribution
constraint, not a conclusion that arbitrary plugin downloads are approved.
[Device and Network Abuse policy](https://support.google.com/googleplay/android-developer/answer/16559646).

**Inference.** Packaging decisions need an explicit OS/CPU/minimum-version matrix,
engine/browser update ownership, native artifact provenance, signing and selected
distribution channels. Existing source availability alone establishes none of those
operational commitments. Review backend and transitive licenses at selection time;
this research provides no legal determination.

## Design consequences and remaining decisions

The primary sources establish real mechanisms for JS execution, React rendering,
native presentation and embedded browsers. They do not establish an off-the-shelf
four-platform combination satisfying all mygo semantics. The following are design
questions, not recommendations to execute experiments during this planning effort:

1. Define whether “native” requires OS widgets or permits Compose/Skia rendering.
2. Choose where React roots run and how headless logic and Web roots communicate.
   Define ownership of effects, errors, state and teardown across that boundary.
3. Specify an engine adapter contract: module resolution, job checkpoints, timers,
   cancellation, bytecode compatibility, errors, diagnostics and resource accounting.
   Network/storage implementations remain platform mechanisms exposed to plugins.
4. Choose realm/process boundaries for simultaneous instances. Cordis lifecycle
   scopes alone do not settle module-version isolation or CPU fault containment.
5. Define surface capabilities with explicit platform exceptions, including Wayland,
   IME composition, focus handoff and browser crash recovery.
6. Define compatible artifact sets and recovery after engine/browser/plugin upgrades.
   A failed upgrade must not depend on an unusable plugin-rendered recovery screen.

Startup cost, throughput, memory budgets, animation smoothness, cancellation latency
and full DSH plugin compatibility remain unknown. They can be specified as acceptance
conditions now; this read-only investigation cannot report them as achieved.
