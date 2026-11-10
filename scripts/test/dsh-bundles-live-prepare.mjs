// Extend the existing real Host/browser smoke in this worktree's ignored anchor.
// CDP observations capture the original module system without changing its inputs.
import '../dsh-startup-live-prepare.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
const path = '.scratch/status-live/anchor/startup-smoke.mjs'
let source = readFileSync(path, 'utf8')
const replace = (from, to) => {
  if (!source.includes(from)) throw new Error(`Startup smoke contract changed: ${from}`)
  source = source.replace(from, to)
}
replace('/json/new?http://127.0.0.1:4178/', '/json/new?about:blank')
replace(' const evidence=await until(async()=>{', `
 const send=(method,params)=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,m=>m.error?reject(Error(m.error.message)):resolve(m.result));ws.send(JSON.stringify({id,method,params}));});
 await send('Page.enable',{});
 await send('Page.addScriptToEvaluateOnNewDocument',{source: \`
   let facade;
   Object.defineProperty(globalThis,'__ModuleLoader__',{configurable:true,get:()=>facade,set:value=>{
     facade=value;
     const create=value.create;
     value.create=function(options){
       globalThis.__bundleSmokeSeeds=options.staticModules;
       const modules=create.call(this,options);
       globalThis.__bundleSmokeModules=modules;
       return modules;
     };
   }});
 \`});
 await send('Page.navigate',{url:'http://127.0.0.1:4178/'});
 const evidence=await until(async()=>{`)
replace("return value.mode==='live' && value.text.includes('Failed to load plugins') && value;", `
   const packages=await evaluate('globalThis.__bundleSmokeModules ? [...globalThis.__bundleSmokeModules.loadCache.keys()] : []');
   await writeFile(scratch+'/bundles-last-observation.json',JSON.stringify({...value,packages},null,2));
   return value.mode==='live' && value.text.includes('Failed to load plugins') && packages.length>10 && {...value,packages};`)
replace(" await writeFile(scratch+'/live-result.json'", `
 const identity=await evaluate(\`(async()=>{
   const modules=globalThis.__bundleSmokeModules, seeds=globalThis.__bundleSmokeSeeds;
   const packages=[];const externals=new Set();
   for(const [id,row] of modules.loadCache){
     if(id==='@deepseek-ai/dsh-client-modules')continue;
     const graph=globalThis.__DSH_BOOT__.entries.find(row=>row.id===id);
     if(!graph)continue;
     const alias=await modules.import(id+'/client');
     if(alias!==row.exports)throw Error('Module alias identity changed: '+id);
     packages.push({id,external:graph.external??[],edges:[...row.edges]});
     for(const edge of row.edges){
       if(Object.hasOwn(seeds,edge)){
         if(await modules.import(edge)!==seeds[edge])throw Error('Static singleton changed: '+edge);
         externals.add(edge);
       }
     }
   }
   return {packages,seedExternals:[...externals],ownsHost:globalThis.__DSH_TRANSPORT__.ownsHost===true};
 })()\`);
 assert.ok(identity.packages.length>0);
 assert.ok(identity.seedExternals.includes('react'),'actual factory resolved original React seed');
 assert.ok(identity.seedExternals.includes('@deepseek-ai/cordis'),'actual factory resolved original Cordis seed');
 assert.equal(identity.ownsHost,false);
 evidence.identity=identity;
 await writeFile(scratch+'/bundles-live-result.json'`)
replace("scratch+'/live-dom.html'", "scratch+'/bundles-live-dom.html'")
writeFileSync('.scratch/status-live/anchor/bundles-smoke.mjs', source)
