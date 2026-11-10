// Existing provider configuration seam; no Session, Host RPC or client replacement.
import {startModelMock} from './dsh-model-mock.mjs';
import {writeFile} from 'node:fs/promises';
export async function prepareTestModel(scratch) {
 const mode=process.env.DSH_TEST_PROVIDER??'mock';
 if(mode==='real')return {mode,patchFiles:[],close:async()=>{}};
 if(mode!=='mock')throw Error('DSH_TEST_PROVIDER must be mock or real');
 const mock=await startModelMock({port:Number(process.env.DSH_MOCK_PORT??0)});
 // The OpenAI protocol adapter requires a key. This is public, nonsecret test data.
 process.env.DSH_LOCAL_MOCK_KEY='nonsecret-local-model-mock';
 const path=scratch+'/model-mock.patch.yml';
 await writeFile(path,`- id: llm-deepseek
  disabled: true
- id: llm-deepseek-account
  disabled: true
- id: llm-pi-ai
  config:
    providers:
      local-model-mock:
        displayName: Local model MOCK (no real LLM)
        api: openai-completions
        baseURL: ${mock.origin}/v1
        apiKeyEnv: DSH_LOCAL_MOCK_KEY
        retryPolicy:
          mode: normal
          maxRetries: 0
        models:
          - id: deterministic-mock
            name: Deterministic local MOCK
            contextWindow: 32768
            maxTokens: 1024
            reasoningEfforts: false
- id: agent-default-model
  config:
    provider: local-model-mock
    model: deterministic-mock
`,{mode:0o600});
 return {mode,origin:mock.origin,stats:mock.stats,patchFiles:[path],close:mock.close};
}
