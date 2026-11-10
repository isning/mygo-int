// Fragment inserted into the existing Nix Chromium driver; original React menus.
{
const calls=[],responses=[],previousDownload=ws.onmessage;
ws.onmessage=e=>{const m=JSON.parse(e.data),p=m.params;if(m.method==='Network.requestWillBeSent' && /\/api\/workspaceFiles\/(stat|readBytes)$/.test(new URL(p.request.url).pathname))calls.push({url:p.request.url,body:JSON.parse(p.request.postData)});if(m.method==='Network.responseReceived' && /\/api\/workspaceFiles\/(stat|readBytes)$/.test(new URL(p.response.url).pathname))responses.push({url:p.response.url,status:p.response.status,mimeType:p.response.mimeType});previousDownload(e)};
const downloadDirectory=scratch+'/downloads-'+Date.now();
await mkdir(downloadDirectory,{recursive:true,mode:0o700});
await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloadDirectory});
await until(()=>evaluate("[...document.querySelectorAll('[role=treeitem]')].some(x=>x.innerText==='Local test DSH')"));
await evaluate("[...document.querySelectorAll('[role=treeitem]')].find(x=>x.innerText==='Local test DSH')?.click()");
await until(()=>evaluate("document.body.innerText.includes('Local MODEL MOCK reply')"));
await evaluate("[...document.querySelectorAll('[role=treeitem],button,[role=button]')].find(x=>x.innerText==='Local MODEL MOCK reply')?.click()");
await until(()=>evaluate("document.body.innerText.includes('ticket41.txt') && !document.body.innerText.includes('Loading history')"));
await writeFile(scratch+'/before-menu.json',JSON.stringify(await evaluate("({text:document.body.innerText,html:document.body.innerHTML})")));
// The closing-turn inline mention carries the original Session/path context target.
async function menu() {
 const point=await evaluate("(()=>{const e=[...document.querySelectorAll('code,button,a')].find(x=>x.textContent==='ticket41.txt');if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
 assert.ok(point,'original delivered file mention');
 await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'right',clickCount:1,...point});
 await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'right',clickCount:1,...point});
 await until(()=>evaluate("[...document.querySelectorAll('[role=menuitem],button')].some(x=>x.textContent.trim()==='Download' && x.getAttribute('aria-disabled')!=='true')"));
 await evaluate("[...document.querySelectorAll('[role=menuitem],button')].find(x=>x.textContent.trim()==='Download')?.click()");
}
await menu();
await until(async()=>{try{return (await readFile(downloadDirectory+'/ticket41.txt')).length>0}catch{return false}});
await writeFile(scratch+'/download-ready.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
// Rename only our fixture after the menu resolves, so readBytes fails in real Host.
const point=await evaluate("(()=>{const e=[...document.querySelectorAll('code,button,a')].find(x=>x.textContent==='ticket41.txt');const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'right',clickCount:1,...point});
await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'right',clickCount:1,...point});
await until(()=>evaluate("[...document.querySelectorAll('[role=menuitem],button')].some(x=>x.textContent.trim()==='Download' && x.getAttribute('aria-disabled')!=='true')"));
const {rename}=await import('node:fs/promises');
await rename(scratch+'/ticket41.txt',scratch+'/ticket41-unavailable.txt');
try {
 await evaluate("[...document.querySelectorAll('[role=menuitem],button')].find(x=>x.textContent.trim()==='Download')?.click()");
 await until(()=>evaluate("document.body.innerText.includes('Could not save. Check the source and destination, then retry.')"));
 await writeFile(scratch+'/download-failed.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 const {readdir}=await import('node:fs/promises');
 assert.deepEqual(await readdir(downloadDirectory),['ticket41.txt'],'failed read creates no second download');
 assert.equal(await evaluate('location.origin'),'http://100.97.207.47:4186');
 assert.equal(await evaluate('globalThis.__DSH_TRANSPORT__?.ownsHost===true'),false);
 assert.ok(calls.filter(x=>x.body.method==='workspaceFiles/readBytes').length>=2,'real Remote reads for success and failure');
 await writeFile(scratch+'/download-browser.json',JSON.stringify({ok:true,calls,responses,downloadPath:downloadDirectory+'/ticket41.txt',origin:await evaluate('location.origin'),failureText:await evaluate('document.body.innerText'),ownsHost:await evaluate('globalThis.__DSH_TRANSPORT__?.ownsHost===true')},null,2));
}finally{await rename(scratch+'/ticket41-unavailable.txt',scratch+'/ticket41.txt')}
}
