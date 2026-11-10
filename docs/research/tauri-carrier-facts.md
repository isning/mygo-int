# Tauri as a platform carrier

Read-only official-document review, 2026-11-10. No installation, build or runtime
experiment. Live documentation/API versions must be pinned before implementation.

## Established facts

Tauri uses WebView2 on Windows and WebKit through WKWebView on macOS and WebKitGTK
on Linux. Android uses the system WebView provider. The browser engine/version is
therefore platform-dependent rather than one bundled universal runtime.
[Official WebView reference](https://v2.tauri.app/reference/webview-versions/).

Its capabilities constrain command access by window/WebView; multiple matching
grants combine. Remote command access is configurable rather than automatically
available to remote sites. The official documentation warns that Linux/Android
cannot distinguish embedded-iframe requests from the containing window for this
feature. Capability configuration alone does not validate custom command handlers.
[Official capabilities documentation](https://v2.tauri.app/security/capabilities/).

Tauri mobile plugins can contain Kotlin/Java or Swift native code and expose commands
through the plugin architecture. Desktop/mobile implementations can differ while
sharing an API. This is a mechanism for platform functionality, not documentation
of a general native widget renderer.
[Official mobile-plugin guide](https://v2.tauri.app/develop/plugins/develop-mobile/).

The current JavaScript Webview API documents feature and platform qualifications.
Do not infer arbitrary multi-WebView embedding or backend equivalence merely from
an API type existing.
[Official Webview API](https://v2.tauri.app/reference/javascript/api/namespacewebview/).

## Consequences for mygo (design inferences)

Tauri is a plausible desktop carrier for the extracted official React client and
platform services. It is not, by itself, mygo's native Slot renderer. A native face
needs a platform receiver/component implementation and supported embedding behavior.

If each platform has its own carrier, share the JS/Cordis/module/Slot contracts and
capability protocol while implementing native widgets, storage/credentials, Web
mounts and OS lifecycle using that carrier. This avoids forcing all targets into
Compose, RN or Tauri while preserving one plugin-facing model.

Treat desktop Web engine behavior and native/Web composition as explicit backend
capabilities. Do not call a DOM control native solely because it runs in Tauri.
Do not silently satisfy a native-required mount by painting a visually similar DOM
control; any Web alternative must be declared and chosen by the mount policy.

The Linux/Android iframe qualification means an untrusted iframe inside a privileged
Tauri view cannot be assumed to have independent IPC authority. Use an actual
restricted context and validated scoped channels; backend isolation must also account
for cookies, storage, navigation, module versions and process behavior.

## Unknowns and future checks

This review does not establish the final carrier/version matrix, arbitrary nested
native widgets within a Tauri window, independent browser storage profiles across
all target backends, or performance/IME/accessibility parity. The architecture must
make these implementation obligations explicit rather than advertise them as done.
