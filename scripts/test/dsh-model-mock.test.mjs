import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startModelMock} from '../dsh-model-mock.mjs';
test('loopback mock streams deltas, finish, usage and DONE; closes its listener',async()=>{
 const requests=[];const mock=await startModelMock({onRequest:x=>requests.push(x)});
 try{
  assert.equal((await fetch(mock.origin+'/health').then(r=>r.json())).kind,'model-mock');
  assert.equal((await fetch(mock.origin+'/no-proxy')).status,404);
  assert.equal((await fetch(mock.origin+'/v1/chat/completions',{method:'POST',body:'{}'})).status,400);
  const response=await fetch(mock.origin+'/v1/chat/completions',{method:'POST',body:JSON.stringify({model:'deterministic-mock',messages:[{role:'user',content:'test'}],stream:true})});
  assert.match(response.headers.get('content-type'),/text\/event-stream/);
  const reader=response.body.getReader();let reads=0,wire='';for(;;){const {value,done}=await reader.read();if(done)break;reads++;wire+=new TextDecoder().decode(value);}
  assert.ok(reads>=3,'incremental HTTP streaming');
  const events=wire.trim().split('\n\n').map(x=>x.slice(6));assert.equal(events.pop(),'[DONE]');
  const chunks=events.map(JSON.parse);assert.equal(chunks.at(-2).choices[0].finish_reason,'stop');
  assert.equal(chunks.at(-1).usage.total_tokens,26);
  assert.equal(chunks.flatMap(x=>x.choices).map(x=>x.delta.content??'').join(''),'Hello! This is a deterministic local model mock reply.');
  assert.deepEqual(requests,[{model:'deterministic-mock',stream:true,messageCount:1}]);
 }finally{await mock.close();}
 await assert.rejects(fetch(mock.origin+'/health'));
});
