# Independent official DSH startup

This mygo-owned document loads the **unchanged original Web entry bundle** from
DSH `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`. That entry constructs the real
`AppWebEntry`, which renders its real `BootPage`. No Host-generated application
HTML, preview-worker bootstrap, manifest, transport or replacement UI is supplied.

First acquire and build artifacts in this worktree using the exact commands in
[the artifact handoff](../../docs/upstream/dsh-artifact-build.md). Keep the full
ignored checkout and dependency/build products. Documentation commits alone do
not supply these files. Node 24.9+ with TypeScript stripping is required.

From the mygo root:

```bash
node scripts/dsh-startup.mjs build
node scripts/dsh-startup.mjs serve
# Open http://127.0.0.1:4178
# Optional: PORT=4180 node scripts/dsh-startup.mjs serve
```

`serve` rebuilds the small document first; stop with Ctrl-C. `build` writes only
`.scratch/dsh-startup/index.html`. The server mounts the original `dist/assets`
at `/assets` without copying or rebuilding them; the generated document alone
is not a portable deployment. It binds only to loopback and exposes no upstream
source, dependency directories or Host APIs. No package install is needed for
this entry itself.

Before either command, the source verifier checks the pinned revision and pristine
tracked sources, and upstream's `readClientBuildRecord` verifies its artifact
closure. The script imports the original entry/CSS/preload asset tags from the
built index into mygo's own template. All compiled bytes and module IDs remain
unchanged: no second bundler, React/Cordis copy, Loader implementation, session
manager or custom `BootSeams` is introduced. The upstream Vite serve guard stays
unchanged; this explicitly diagnostic static carrier does not invoke Vite serve.

Without bootstrap the expected official report is:

```text
HARNESS
Failed to load plugins
web boot: window.__ModuleLoader__ bootstrap facade is missing
```

This failure is the intended issue 28 boundary, not a connected client. Issue 31
owns supplying real bootstrap and the later resource/auth/transport contracts.
Do not inject an empty plugin manifest or set readiness/module-loader globals to
make this page look successful. That integration must happen before the original
entry executes; it must retain the same official module graph.

For distribution, retain upstream LICENSE/THIRD_PARTY_NOTICES and selected asset
licenses (including `assets/fonts/Montserrat-OFL.txt`) and inspect the selected
closure as described in the handoff. This local entry does not perform packaging
or assert complete dependency-license clearance.

## Verification (2026-11-10)

Consumer rebuild in this worktree passed the original 8/8 artifact gates in
102.82 seconds (Node 24.21.0, pnpm 11.28.5, Clang 21.1.8), followed by source
and build-record verification. `build` and `serve` both passed. HTTP checks
confirmed the four entry/vendor JS/CSS assets are byte-identical to upstream,
unknown/source paths return 404 and POST returns 405. Node syntax and Git
whitespace checks passed.

T3 preview could not open because its host browser libraries were missing.
A real Nix Chromium 155 headless run against the loopback server succeeded:
the rendered DOM contained the exact report above, and its screenshot was
visually inspected. Local evidence stays ignored at
`.scratch/dsh-startup/browser-dom.html`, `startup.png` and `browser.log`.
This is browser evidence of the official missing-bootstrap path only; no
connected session, authentication or plugin activation was exercised.

Reproduce the browser check after starting the server (Nix may download Chromium):

```bash
mkdir -p .scratch/dsh-startup/browser
XDG_CACHE_HOME="$PWD/.scratch/browser-cache" nix shell nixpkgs#chromium -c chromium \
  --headless --disable-gpu --no-first-run --no-default-browser-check \
  --user-data-dir="$PWD/.scratch/dsh-startup/browser" \
  --virtual-time-budget=5000 --dump-dom \
  --screenshot="$PWD/.scratch/dsh-startup/startup.png" --window-size=1280,900 \
  http://127.0.0.1:4178 \
  > .scratch/dsh-startup/browser-dom.html 2> .scratch/dsh-startup/browser.log
```
