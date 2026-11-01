import { afterEach, describe, expect, it, vi } from 'vitest';
import { callAI } from '../../src/ai/provider';
afterEach(() => vi.unstubAllGlobals());
describe('AI provider', () => {
  it('passes cancellation and conversation roles to fetch', async () => {
    const controller = new AbortController();
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: '{}' } }] }) }));
    vi.stubGlobal('fetch', fetcher);
    await callAI({endpoint:'https://example.test',apiKey:'test',model:'test'}, [{role:'assistant',content:'history'}], 0.3, 1024, controller.signal);
    expect((fetcher.mock.calls[0] as any)[1].signal).toBe(controller.signal);
  });
  it('keeps JSON mode for analysis but omits it for natural-language followups', async () => {
    const fetcher=vi.fn(async()=>({ok:true,json:async()=>({choices:[{message:{content:'正常回答'},finish_reason:'stop'}]})}));
    vi.stubGlobal('fetch',fetcher);
    const config={endpoint:'https://example.test',apiKey:'test',model:'test'};
    await callAI(config,[{role:'user',content:'分析'}]);
    await callAI(config,[{role:'user',content:'我觉得能凑一对啊'}],0.3,4096,undefined,'text');
    const requests=fetcher.mock.calls.map(call=>JSON.parse((call as any)[1].body));
    expect(requests[0].response_format).toEqual({type:'json_object'});
    expect(requests[1]).not.toHaveProperty('response_format');
  });
  it('recognizes the actual whitespace-only successful response instead of passing it to a JSON parser', async () => {
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({choices:[{message:{content:' '.repeat(182)},finish_reason:'stop'}]})})));
    const result=await callAI({endpoint:'https://example.test',apiKey:'test',model:'test'},[{role:'user',content:'我觉得能凑一对啊'}]);
    expect(result.error).toContain('空回答');
  });
  it('does not return a truncated response or hidden reasoning as a usable answer', async () => {
    const config={endpoint:'https://example.test',apiKey:'test',model:'test'};
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({choices:[{message:{content:'尚未完成'},finish_reason:'length'}]})})));
    expect((await callAI(config,[{role:'user',content:'解释'}])).error).toContain('长度上限');
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({choices:[{message:{content:'',reasoning_content:'内部推理'},finish_reason:'stop'}]})})));
    const empty=await callAI(config,[{role:'user',content:'解释'}]);
    expect(empty.error).toContain('空回答');
    expect(empty.content).toBe('');
  });
});
