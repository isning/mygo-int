// Rehearse one parent wiring seam in owned scratch, without editing shared startup.
import './dsh-status-live-prepare.mjs'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const root = process.cwd(), scratch = resolve('.scratch/terminal-live')
await mkdir(scratch, { recursive: true, mode: 0o700 })
const once = (source, from, to) => {
  if (source.split(from).length !== 2) throw Error(`Wiring seam changed: ${from}`)
  return source.replace(from, to)
}
let server = await readFile('scripts/dsh-startup.mjs', 'utf8')
server = once(server, "const workspace = resolve(dirname(fileURLToPath(import.meta.url)), '..')", `const workspace = ${JSON.stringify(root)}`)
server = server.replaceAll("'../entries/dsh-startup/session-assets.js'", JSON.stringify(pathToFileURL(resolve('entries/dsh-startup/session-assets.js')).href))
server = server.replace(/(['"])\.\/(dsh-[\w-]+\.mjs)\1/g, (_, quote, file) => JSON.stringify(pathToFileURL(resolve('scripts', file)).href))
server = once(server, '  const assetRoot =', `  const {createTerminalReadCarrier} = await import(${JSON.stringify(pathToFileURL(resolve('scripts/dsh-terminal-carrier.mjs')).href)})
  const terminalReadCarrier = createTerminalReadCarrier({origin:process.env.DSH_ORIGIN,cookie:ownerCookie,publicOrigins})
  const assetRoot =`)
server = once(server, '      if (carrier &&', '      if (await terminalReadCarrier(request, response)) return\n      if (carrier &&')
await writeFile(scratch + '/startup.mjs', server)
let host = await readFile('scripts/dsh-test-host-runner.mjs', 'utf8')
host = once(host, "resolve('.scratch/test-dsh')", "resolve('.scratch/terminal-live')")
host = once(host, "root+'/scripts/dsh-startup.mjs'", "scratch+'/startup.mjs'")
host = once(host, 'process.env.DSH_CLIENT_PORT??4180', '4185')
// A rerun restores its owned saved Session through the original prompt path.
host = once(host, '  if(blank){', '  if(blank || !ctx.agents.get(fixtureId)){')
host = once(host, "carrier.on('exit',()=>{if(!stopping)void stop();});", "carrier.on('exit',()=>{if(!stopping)void stop(1);});")
host = host.slice(0, host.indexOf(' const credential=')) + `
 const agent=ctx.agents.get(fixtureId);assert.ok(agent,'original Host Agent is active');
 const expectedShells=await ctx.terminalController.shells(agent,new AbortController().signal);
 assert.ok(expectedShells.length>0,'real execution provider discovered shells');
 await writeFile(scratch+'/status.json',JSON.stringify({origin,clientUrl,sessionId:fixtureId,expectedShells}),{mode:0o600});
 const browser=spawn(process.execPath,[root+'/scripts/dsh-terminal-browser.mjs'],{stdio:'inherit',env:process.env});
 assert.equal(await new Promise(r=>browser.once('exit',r)),0,'original shell menu browser check');
 assert.deepEqual(ctx.terminalController.list(fixtureId),[],'no terminal process allocated');
 await stop(0);
} catch(e){console.error(e);await stop(1);}
`
await writeFile(resolve('.scratch/status-live/anchor/terminal-host.mjs'), host)
console.log('Prepared isolated original Terminal shell-menu check on port 4185')
