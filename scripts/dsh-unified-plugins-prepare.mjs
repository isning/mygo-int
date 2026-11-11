// Isolated acceptance build extension. Does not edit the shared build or startup.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
const root = process.cwd(), scratch = resolve('.scratch/unified-plugins')
await mkdir(scratch, { recursive: true })
let build = await readFile('scripts/dsh-local-composition-build.mjs', 'utf8')
build = build.replace("importer?.startsWith(resolve(root, 'entries/dsh-startup/local/management-ui.tsx'))", "(importer?.startsWith(resolve(root, 'entries/dsh-startup/local/management-ui.tsx')) || importer?.startsWith(resolve(root, 'entries/dsh-startup/local/unified-plugin-ui.tsx')))")
build = build.replace('async load(id) {', `async load(id) {
      if (id === resolve(root, 'entries/dsh-startup/single-client.js')) {
        return (await readFile(id, 'utf8')).replace("const staticModules = getStaticModules()", "const staticModules = getStaticModules(); staticModules['mygo/dsh-unified-plugin-ui'] = unifiedUI").replace("import * as managementUI", "import * as unifiedUI from './local/unified-plugin-ui.tsx';\\nimport * as managementUI")
      }`)
await writeFile(scratch + '/build.mjs', build)
let startup = await readFile('scripts/dsh-startup.mjs', 'utf8')
// Preserve script-relative imports and the repository root after relocation.
startup = startup.replaceAll("from './", `from '${root}/scripts/`).replaceAll("import('./", `import('${root}/scripts/`)
startup = startup.replace(/const workspace = .*\n/, `const workspace = ${JSON.stringify(root)}\n`)
startup = startup.replace("resolve(workspace, 'scripts/dsh-local-composition-build.mjs')", JSON.stringify(scratch + '/build.mjs'))
await writeFile(scratch + '/startup.mjs', startup)
let runner = await readFile('scripts/dsh-test-host-runner.mjs', 'utf8')
runner = runner.replace("root+'/scripts/dsh-startup.mjs'", JSON.stringify(scratch + '/startup.mjs'))
await writeFile(scratch + '/test-host.mjs', runner)
let controller = await readFile('scripts/dsh-test-host.mjs', 'utf8')
controller = controller.replaceAll("from './", `from '${root}/scripts/`)
controller = controller.replace(/const root=resolve.*?;process.chdir\(root\);/, `const root=${JSON.stringify(root)};process.chdir(root);`)
controller = controller.replace("copyFile('scripts/dsh-test-host-runner.mjs',", `copyFile(${JSON.stringify(scratch + '/test-host.mjs')},`)
await writeFile(scratch + '/host.mjs', controller)
const config = JSON.parse(await readFile('entries/dsh-startup/local/single-root.json', 'utf8'))
config.entries.push({ id: 'unified-plugin-manager', name: './plugins/unified-plugin-manager.js' })
await writeFile(scratch + '/startup.json', JSON.stringify(config, null, 2))
console.log('Prepared isolated unified plugin build, runner and startup')
