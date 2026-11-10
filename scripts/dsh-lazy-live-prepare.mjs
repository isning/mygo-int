// Isolated wiring rehearsal. Shared startup/bootstrap/Host sources stay untouched.
import './dsh-status-live-prepare.mjs'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const root = process.cwd(), scratch = resolve('.scratch/lazy-live')
await mkdir(scratch, { recursive: true, mode: 0o700 })
const once = (source, from, to) => {
  if (source.split(from).length !== 2) throw new Error(`Wiring seam changed: ${from}`)
  return source.replace(from, to)
}
let server = await readFile('scripts/dsh-startup.mjs', 'utf8')
server = once(server, "const workspace = resolve(dirname(fileURLToPath(import.meta.url)), '..')", `const workspace = ${JSON.stringify(root)}`)
server = server.replaceAll("'../entries/dsh-startup/session-assets.js'", JSON.stringify(pathToFileURL(resolve('entries/dsh-startup/session-assets.js')).href))
for (const file of ['dsh-bootstrap-carrier.mjs', 'dsh-rpc-carrier.mjs', 'dsh-session-carrier.mjs']) server = server.replaceAll(`'./${file}'`, JSON.stringify(pathToFileURL(resolve('scripts', file)).href))
server = once(server, '  const assetRoot =', `  const {createLazyCarrier} = await import(${JSON.stringify(pathToFileURL(resolve('scripts/dsh-lazy-carrier.mjs')).href)})
  const lazyCarrier = createLazyCarrier({origin:process.env.DSH_ORIGIN,cookie:ownerCookie})
  const assetRoot =`)
server = once(server, '      if (carrier &&', '      if (await lazyCarrier(request, response)) return\n      if (carrier &&')
server = once(server, "      } else if (bootEnabled && ['/mygo-boot/session-assets.js'", `      } else if (path === '/mygo-boot/lazy-resources.js') {
        data = await readFile(resolve(workspace, 'entries/dsh-startup/lazy-resources.js'))
        extension = '.js'
      } else if (bootEnabled && ['/mygo-boot/session-assets.js'`)
server = once(server, "        extension = '.js'\n      } else if (path.startsWith('/assets/'))", `        if (path.endsWith('/bootstrap.js')) {
          data = "import {lazyBundleReferences} from '/mygo-boot/lazy-resources.js'\\n" + data.toString().replace('const references = graphBundleReferences(graphs[0].value)', 'const references = graphBundleReferences(graphs[0].value); for (const reference of lazyBundleReferences(graphs[0].value)) references.add(reference)')
        }
        extension = '.js'
      } else if (path.startsWith('/assets/'))`)
await writeFile(scratch + '/startup.mjs', server)

let host = await readFile('scripts/dsh-test-host-runner.mjs', 'utf8')
host = once(host, "resolve('.scratch/test-dsh')", "resolve('.scratch/lazy-live')")
host = once(host, "root+'/scripts/dsh-startup.mjs'", "scratch+'/startup.mjs'")
host = once(host, 'process.env.DSH_CLIENT_PORT??4180', '4182')
// Stop after this check; no retained server, polling loop or credential inspection.
host = host.slice(0, host.indexOf(' const credential=')) + `
 await writeFile(scratch+'/status.json',JSON.stringify({origin,clientUrl,sessionId:fixtureId}),{mode:0o600});
 const browser=spawn(process.execPath,[root+'/scripts/dsh-lazy-browser.mjs'],{stdio:'inherit',env:process.env});
 const code=await new Promise(r=>browser.once('exit',r));
 assert.equal(code,0,'original lazy UI browser check');
 await stop(0);
} catch(e){console.error(e);await stop(1);}
`
await writeFile(resolve('.scratch/status-live/anchor/lazy-host.mjs'), host)
console.log('Prepared isolated lazy UI wiring on port 4182')
