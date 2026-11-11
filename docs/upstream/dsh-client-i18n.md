# Local client internationalization

The `client-i18n` bootstrap plugin reuses the pinned official `LocaleRuntime`
class. It registers the `mygo.client` namespace with the original register/bind
contract and owns all dictionary subscriptions through Cordis effects.

The dictionaries cover English, Simplified Chinese, Japanese, Spanish, French,
German, Russian and Portuguese. Additional offline languages are registered with
the same ids/native labels/English fallback as the official locale plugin; the
standalone class itself initially catalogs only English and Chinese.

Before connection, language comes from the remembered device/instance/auth-view
preference or the browser's languages. The local shell exposes a language selector.
Selection stays on the device and survives reload; no Host settings call is made.
After connection the adapter registers its namespace on the original instance
locale service and subscribes to that source. Original connected Language settings
remain authoritative. The last active language is remembered for the next offline
start. Document language follows the original convention (`zh-CN` for `zh`).

The default surfaces covered are the local shell, Instances and Client settings,
forms, modal/buttons/accessibility labels, sidebar instance menu, Local plugin
names/descriptions/configuration and runtime detail/status hints. Remote/Client
badge names and package/Entry ids remain technical identifiers. User-entered names,
addresses and note content are not translated. Unknown runtime/Remote diagnostics
retain their original text; known local form errors use registered copy.

Slot labels use translation callbacks, as official plugins do. A locale dictionary
object is not a React node and must not be returned as a label. Components subscribe
to the locale revision; imperative badge hints also subscribe and clean up.
`i18n.ts` supplies the Context service type augmentation. Explicit legacy startup
installs the same local dictionary service for its shared local settings components;
historical diagnostic-only legacy text remains unchanged.

Verification (workspace environment from `scripts/dsh-test-env.sh`):

- Default and explicit legacy Vite builds passed. No adapter-wide semantic
  TypeScript/checkJs coverage is claimed.
- `node --test scripts/test/*.test.mjs`: 36 passed. Dictionary tests check all eight
  key sets, nonempty values, interpolation parity and default-surface/metadata keys.
- `node scripts/dsh-unified-plugins-browser.mjs --i18n-only`: real Chromium switched
  all eight offline languages, restored the choice after reload, saved local
  profiles with no Host management writes, then adopted the retained Host's Chinese
  locale and displayed translated Local plugin metadata. It does not change Host
  language as part of the test. Evidence: `.scratch/test-dsh/i18n-validation.json`.
- `node scripts/dsh-test-browser.mjs check-instance`: original New Session,
  MODEL MOCK reply/receipt correlation, cleared draft and no duplicate passed.
- Pinned source verification and whitespace/syntax checks passed.

The product-native preview reported missing host libraries; the documented Nix
Chromium workflow was used. Physical Android and native-language editorial review
were not performed. No upstream source or remote Git state was modified.
