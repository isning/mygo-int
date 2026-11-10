// Read by the standalone harness and inserted into the existing CDP browser driver.
// Uses the original file input, not a synthetic upload request or replacement UI.
{
await until(()=>evaluate("[...document.querySelectorAll('[role=treeitem]')].some(x=>x.innerText==='Local test DSH')"));
await evaluate("[...document.querySelectorAll('[role=treeitem]')].find(x=>x.innerText==='Local test DSH')?.click()");
await until(()=>evaluate("document.body.innerText.includes('Local MODEL MOCK reply')"));
await evaluate("[...document.querySelectorAll('[role=treeitem],button,[role=button]')].find(x=>x.innerText==='Local MODEL MOCK reply')?.click()");
await until(()=>evaluate("!!document.querySelector('input[type=file]:not(:disabled)') && !!document.querySelector('[contenteditable=true]') && !document.body.innerText.includes('Loading history')"));
async function pick(path) {
  const {root}=await send('DOM.getDocument',{});
  const {nodeId}=await send('DOM.querySelector',{nodeId:root.nodeId,selector:'input[type=file]'});
  assert.ok(nodeId,'original file input');
  await send('DOM.setFileInputFiles',{nodeId,files:[path]});
}
await pick(scratch+'/ticket40.txt');
await until(()=>evaluate("!!document.querySelector('[title=\"ticket40.txt\"]') && document.querySelector('[title=\"ticket40.txt\"]').innerText.includes('TXT')"));
const ready=await evaluate("({text:document.body.innerText,card:document.querySelector('[title=\"ticket40.txt\"]').outerHTML})");
assert.ok(!ready.card.includes('Retry'),'original file card is ready');
await writeFile(scratch+'/upload-ready.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
// Real browser read failure: an absent path inside our own scratch, never user data.
await pick(scratch+'/unreadable-ticket40.txt');
await until(()=>evaluate("!!document.querySelector('[title=\"unreadable-ticket40.txt\"] button[aria-label*=\"Retry\"]')"));
const failed=await evaluate("({text:document.body.innerText,card:document.querySelector('[title=\"unreadable-ticket40.txt\"]').outerHTML,buttons:[...document.querySelectorAll('button')].map(x=>({label:x.getAttribute('aria-label'),disabled:x.disabled}))})");
assert.ok(failed.card.includes('Upload failed'),'original upload failure is visible');
await evaluate("document.querySelector('[contenteditable=true]').focus()");
await send('Input.insertText',{text:'Keep this draft when an upload fails.'});
await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
await pause(500);
assert.equal(promptCalls.length,0,'failed upload does not silently submit text');
assert.equal(await evaluate("document.querySelector('[contenteditable=true]').innerText"),'Keep this draft when an upload fails.');
await writeFile(scratch+'/upload-failed.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
await writeFile(scratch+'/upload-browser.json',JSON.stringify({ok:true,ready,failed,noPrompt:promptCalls.length===0},null,2));

}
