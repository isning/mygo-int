// Observe the existing exact image capability in the original home animation.
import './dsh-startup-live-prepare.mjs'
import { readFileSync, writeFileSync } from 'node:fs'

let source = readFileSync('.scratch/status-live/anchor/startup-smoke.mjs', 'utf8')
source = source.replace(" const evidence=await until", `
 const {createHash}=await import('node:crypto');
 const reference='plugins/@deepseek-ai/dsh-client-ui-brand-official/assets/breach-atlas-43c5305a3d4d.webp';
 const imageUrl='http://127.0.0.1:4178/'+reference;
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,m=>m.error?reject(Error(m.error.message)):resolve(m.result));ws.send(JSON.stringify({id,method,params}));});
 const responses=new Map(),finished=new Set(),failures=[];
 const previous=ws.onmessage;
 ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.method==='Network.responseReceived'){responses.set(m.params.requestId,m.params.response);if(m.params.response.status>=400)failures.push({url:m.params.response.url,status:m.params.response.status});}if(m.method==='Network.loadingFinished')finished.add(m.params.requestId);previous(event);};
 await send('Network.enable');
 await send('Page.enable');
 await send('Network.setCacheDisabled',{cacheDisabled:true});
 // Transparent observation at the original renderer's image decode/draw boundary.
 // The original Image, src, load callback, draw arguments and return value stay intact.
 await send('Page.addScriptToEvaluateOnNewDocument',{source:\`const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(image,...args){if(image instanceof HTMLImageElement && image.currentSrc.includes('breach-atlas-'))globalThis.__mygoAtlasDecode={currentSrc:image.currentSrc,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,complete:image.complete};return Reflect.apply(draw,this,[image,...args]);};\`});
 await send('Page.reload');
 await send('Page.bringToFront');
 await until(async()=>await evaluate("globalThis.__ModuleLoader__?.mode==='live' && !!document.querySelector('canvas[data-home-whale]') && !document.body.innerText.includes('Failed to load plugins')"));
 await pause(1000);
 // Hit-test blank home space, then use real Chromium input (no renderer play call).
 const point=await evaluate(\`(()=>{const canvas=document.querySelector('canvas[data-home-whale]');const r=canvas.getBoundingClientRect();for(const fy of [.15,.25,.75,.85])for(const fx of [.25,.5,.75]){const x=r.x+r.width*fx,y=r.y+r.height*fy;const el=document.elementFromPoint(x,y);if(el&&canvas.parentElement.contains(el)&&!el.closest('button,a,input,textarea,select,label,[contenteditable],[role=button],[data-composer-card]'))return {x,y};}return null;})()\`);
 assert.ok(point,'original home has clickable blank space');
 await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
 await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
 await writeFile(scratch+'/assets-click.json',JSON.stringify({point,state:await evaluate("({hidden:document.hidden,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,hit:document.elementFromPoint("+point.x+","+point.y+")?.outerHTML.slice(0,1000)})")},null,2));
 const decoded=await until(async()=>await evaluate('globalThis.__mygoAtlasDecode'));
 assert.equal(decoded.currentSrc,imageUrl);
 assert.equal(decoded.naturalWidth,2304);
 assert.equal(decoded.naturalHeight,1296);
 assert.equal(decoded.complete,true);
 await pause(700);
 const painted=await until(async()=>await evaluate(\`(()=>{const c=document.querySelector('canvas[data-home-whale]'),r=c.getBoundingClientRect(),style=getComputedStyle(c);const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let count=0;for(let i=3;i<p.length;i+=4)if(p[i])count++;return count>0&&{width:c.width,height:c.height,visible:r.width>0&&r.height>0&&style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)>0,opacity:style.opacity,nontransparentPixels:count};})()\`));
 assert.equal(painted.visible,true);
 const screenshot=await send('Page.captureScreenshot',{format:'png'});
 await writeFile(scratch+'/assets-open.png',Buffer.from(screenshot.data,'base64'));
 const [requestId,response]=await until(()=>[...responses].find(([id,r])=>r.url===imageUrl&&finished.has(id)));
 assert.equal(response.status,200);
 assert.equal(response.mimeType,'image/webp');
 assert.ok(!response.fromDiskCache&&!response.fromServiceWorker,'real network response');
 const body=await send('Network.getResponseBody',{requestId});
 const browserBytes=Buffer.from(body.body,body.base64Encoded?'base64':'utf8');
 const targetUrl=new URL('/'+reference,origin);
 assert.equal(targetUrl.origin,origin,'configured original Host origin');
 const target=await fetch(targetUrl,{headers:{cookie},redirect:'error'});
 assert.equal(target.status,200);
 assert.equal(target.headers.get('content-type')?.split(';')[0],'image/webp');
 const targetBytes=Buffer.from(await target.arrayBuffer());
 assert.deepEqual(browserBytes,targetBytes,'browser network body equals original authenticated target body');
 const unauthenticated=await fetch(targetUrl,{redirect:'manual'});
 // Observe original admission policy; package images are public at this pin.
 assert.equal(unauthenticated.status,200);
 assert.deepEqual(Buffer.from(await unauthenticated.arrayBuffer()),targetBytes,'original public asset body is unchanged');
 for(const suffix of ['?probe=1','-undeclared'])assert.equal((await fetch(imageUrl+suffix)).status,404,'no query or path expansion');
 await writeFile(scratch+'/assets-result.json',JSON.stringify({reference,targetOrigin:origin,browserOrigin:new URL(imageUrl).origin,decoded,painted,network:{status:response.status,mimeType:response.mimeType,bytes:browserBytes.length,sha256:createHash('sha256').update(browserBytes).digest('hex'),targetBodyEqual:true,unauthenticatedStatus:unauthenticated.status},failures},null,2));
 const evidence=await until`)
source = source.replace("value.text.includes('Failed to load plugins')", "!value.text.includes('Failed to load plugins')")
source = source.replaceAll("scratch+'/live-", "scratch+'/assets-live-")
writeFileSync('.scratch/status-live/anchor/assets-smoke.mjs', source)
