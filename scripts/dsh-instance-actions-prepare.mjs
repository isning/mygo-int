// Isolated acceptance build extension. Does not edit the shared build or startup.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
const root = process.cwd(), scratch = resolve('.scratch/instance-actions')
await mkdir(scratch, { recursive: true })
let build = await readFile('scripts/dsh-local-composition-build.mjs', 'utf8')
const red = process.argv.includes('--red')
build = build.replace("['management-ui.tsx', 'unified-plugin-ui.tsx']", "['management-ui.tsx', 'unified-plugin-ui.tsx', 'unified-instance-actions.tsx']")
const single = resolve('entries/dsh-startup/single-client.js')
const surface = resolve('entries/dsh-startup/local/unified-plugin-ui.tsx')
build = build.replace('async load(id) {', `async load(id) {
      if (id === ${JSON.stringify(single)}) return (await readFile(id, 'utf8')).replace('const ctx = new Context()', 'const ctx = new Context(); globalThis.__INSTANCE_ACTIONS_CTX__ = ctx')
      if (id === ${JSON.stringify(surface)}) {
        let source = await readFile(id, 'utf8')
        source = source.replace('rows={[{ ...row, entryId: key }]}', 'rows={[row]}')
        if (!${red}) source = "import { InstanceClientActions } from './unified-instance-actions.tsx';\\n" + source.replace('</article>', "{source === 'INSTANCE CLIENT' && <InstanceClientActions ctx={ctx} row={row} onChanged={() => { update(value => value + 1); setRefresh(value => value + 1) }} />} </article>")
        return source
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
if (!config.entries.some(row => row.id === 'unified-plugin-manager')) config.entries.push({ id: 'unified-plugin-manager', name: './plugins/unified-plugin-manager.js' })
await writeFile(scratch + '/startup.json', JSON.stringify(config, null, 2))
console.log('Prepared isolated instance actions build, runner and startup')
