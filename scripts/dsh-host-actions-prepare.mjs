// Isolated ticket-56 build/fixture; never edits shared startup or upstream sources.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
const root = process.cwd(), scratch = resolve('.scratch/host-actions')
await mkdir(scratch, { recursive: true, mode: 0o700 })
const stage = process.argv[2] ?? 'red'
if (!['red', 'green'].includes(stage)) throw Error('Usage: node scripts/dsh-host-actions-prepare.mjs {red|green}')
const green = stage === 'green'
let build = await readFile('scripts/dsh-local-composition-build.mjs', 'utf8')
build = build.replace("['management-ui.tsx', 'unified-plugin-ui.tsx']", "['management-ui.tsx', 'unified-plugin-ui.tsx', 'unified-host-actions.tsx']")
build = build.replace('async load(id) {', `async load(id) {
  if (id === resolve(root, 'entries/dsh-startup/local/unified-plugin-ui.tsx')) {
    let text = await readFile(id, 'utf8');
    text = text.replace('const [, update] = useState(0)', 'globalThis.__HOST_ACTION_TEST_CONTEXT__ = ctx; const [, update] = useState(0)');
    ${green ? `text = "import { HostPluginActions } from './unified-host-actions.tsx';\\n" + text;
    text = text.replace("{ ...row, entryId: key }", "row");
    text = text.replace('</article>', "{source === 'HOST' && <HostPluginActions ctx={ctx} row={row} onChanged={() => setRefresh(value => value + 1)} />}\\n</article>");` : ''}
    return text;
  }`)
await writeFile(scratch + '/build.mjs', build)
let startup = await readFile('scripts/dsh-startup.mjs', 'utf8')
startup = startup.replaceAll("from './", `from '${root}/scripts/`).replaceAll("import('./", `import('${root}/scripts/`)
startup = startup.replace(/const workspace = .*\n/, `const workspace = ${JSON.stringify(root)}\n`)
startup = startup.replace("resolve(workspace, 'scripts/dsh-local-composition-build.mjs')", JSON.stringify(scratch + '/build.mjs'))
if (green) startup = startup.replace('data = await readFile(file)', `data = await readFile(file); if (path.endsWith('/unified-plugin-manager.js')) data = data.toString().replace("'remote.pluginInventory'", "'remote.pluginInventory', 'remote.pluginManager'")`)
await writeFile(scratch + '/startup.mjs', startup)
let runner = await readFile('scripts/dsh-test-host-runner.mjs', 'utf8')
runner = runner.replace("root+'/scripts/dsh-startup.mjs'", JSON.stringify(scratch + '/startup.mjs'))
runner = runner.replace("import {runProfile}", "import {runProfile,prepareProfile}")
// Append a safe, owned fixture to the real profile's user layer, where the
// original manager can persist a later override after its insertion.
runner = runner.replace('let boot;try{', `const profile = prepareProfile('web');
const patchPath = profile.dir + '/cordis.patch.yml';
const fixtureName = '@mygo/dsh-host-action-fixture';
const fixturePackage = root+'/.scratch/status-live/anchor/node_modules/@mygo/dsh-host-action-fixture';
await mkdir(fixturePackage,{recursive:true});
await writeFile(fixturePackage+'/package.json',JSON.stringify({name:fixtureName,type:'module',version:'0.0.0',exports:'./index.js'}));
await writeFile(fixturePackage+'/index.js',await readFile(${JSON.stringify(scratch + '/fixture.mjs')}));
const anchorManifestPath=root+'/.scratch/status-live/anchor/package.json';
const anchorManifest=JSON.parse(await readFile(anchorManifestPath,'utf8'));
anchorManifest.dependencies[fixtureName]='0.0.0';
await writeFile(anchorManifestPath,JSON.stringify(anchorManifest));
const {parse,stringify} = await import(${JSON.stringify(resolve('.scratch/upstream/deepseek-harness/packages/boot/plugin-manager/node_modules/yaml/dist/index.js'))});
const patches = parse(await readFile(patchPath,'utf8')) ?? [];
const existing = patches.flatMap(p=>p.insert??[]).find(p=>p.id==='mygo-host-action-fixture');
if(existing) existing.name=fixtureName;
else patches.push({insert:[{id:'mygo-host-action-fixture',name:fixtureName}]});
await writeFile(patchPath,stringify(patches));
let boot;try{`)
// Exercise the exact Host method with a real restricted Peer, preserving its
// Gateway envelope and HTTP status. This is an in-process permission proof,
// not a claim of a non-owner browser login mechanism.
runner = runner.replace('await withdraw();await restricted.dispose();', `const deniedToggle = await shared.fetch(new Request(origin+'/api/pluginManager/setPluginEnabled',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'client-request',rpcId:'restricted-host-toggle',method:'pluginManager/setPluginEnabled',payload:{args:{id:'include:mygo-host-action-fixture',enabled:false}}})}),restricted);
const deniedToggleBody = await deniedToggle.json();
assert.equal(deniedToggleBody.error?.code ?? deniedToggleBody.result?.error?.code,'remote-access/denied');
await writeFile(scratch+'/host-action-permission.json',JSON.stringify({status:deniedToggle.status,body:deniedToggleBody}),{mode:0o600});
await withdraw();await restricted.dispose();`)
await writeFile(scratch + '/fixture.mjs', `export const inject = ['connection'];\nexport function apply(ctx) {
  ctx.effect(() => ctx.connection.fetch.register({path:'/api/mygo-host-action-fixture',methods:['GET'],requestBody:'buffered',fetch:async()=>new Response('OWNED HOST FIXTURE ACTIVE')}));
}\n`)
await writeFile(scratch + '/test-host.mjs', runner)
let controller = await readFile('scripts/dsh-test-host.mjs', 'utf8')
controller = controller.replaceAll("from './", `from '${root}/scripts/`)
controller = controller.replace(/const root=resolve.*?;process.chdir\(root\);/, `const root=${JSON.stringify(root)};process.chdir(root);`)
controller = controller.replace("copyFile('scripts/dsh-test-host-runner.mjs',", `copyFile(${JSON.stringify(scratch + '/test-host.mjs')},`)
await writeFile(scratch + '/host.mjs', controller)
console.log('Prepared isolated Host action ' + (green ? 'implementation' : 'RED baseline'))
