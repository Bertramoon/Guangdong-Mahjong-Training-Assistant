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
});
