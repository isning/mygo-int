// Deterministic loopback-only MODEL mock. Never substitutes Host/Session/RPC.
import http from 'node:http';
import {setTimeout as pause} from 'node:timers/promises';

export async function startModelMock({port=0,onRequest=()=>{}}={}) {
 const stats={requests:0,completed:0};
 const server=http.createServer(async(req,res)=>{
  if(req.method==='GET'&&req.url==='/health'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({kind:'model-mock',protocol:'openai-completions'}));return;}
  if(req.method!=='POST'||req.url!=='/v1/chat/completions'){res.writeHead(404);res.end();return;}
  let body='';
  try {
   for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>1024*1024){res.writeHead(413);res.end();return;}}
   const input=JSON.parse(body);
   if(input.stream!==true||!Array.isArray(input.messages)){res.writeHead(400);res.end();return;}
   stats.requests++;
   onRequest({model:input.model,stream:true,messageCount:input.messages.length});
   res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-store','connection':'keep-alive'});
   const id='chatcmpl-local-model-mock';
   const chunk=(delta,finish_reason=null,usage)=>res.write('data: '+JSON.stringify({id,object:'chat.completion.chunk',created:0,model:input.model,choices:usage?[]:[{index:0,delta,finish_reason}],...(usage?{usage}:{})})+'\n\n');
   chunk({role:'assistant',content:''});
   for(const text of ['Hello! ','This is a deterministic ','local model mock reply.']){if(res.destroyed)return;chunk({content:text});await pause(80);}
   chunk({},'stop');
   chunk({},null,{prompt_tokens:12,completion_tokens:14,total_tokens:26});
   res.end('data: [DONE]\n\n');stats.completed++;
  }catch{if(!res.headersSent)res.writeHead(400);res.end();}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
 return {origin:`http://127.0.0.1:${server.address().port}`,stats,close:()=>new Promise((resolve,reject)=>{server.close(e=>e?reject(e):resolve());server.closeIdleConnections();})};
}
