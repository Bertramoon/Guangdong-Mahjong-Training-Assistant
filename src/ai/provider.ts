export interface AIProviderConfig {
  endpoint: string;    // e.g. "https://api.openai.com"
  apiKey: string;
  model: string;       // e.g. "gpt-4o-mini"
}

export interface AIResponse {
  content: string;
  reasoning_content?: string;
  model: string;
  error?: string;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callAI(
  config: AIProviderConfig,
  messages: AIMessage[],
  temperature?: number,
  maxTokens?: number,
  signal?: AbortSignal,
  outputFormat: 'json' | 'text' = 'json',
): Promise<AIResponse> {
  const url = config.endpoint.replace(/\/+$/, '') + '/v1/chat/completions';

  try {
    const deepseekAnalysis = outputFormat === 'json' && config.model === 'deepseek-flash' && new URL(config.endpoint).hostname === 'api.deepseek.com';
    const response = await fetch(url, {
      signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: maxTokens ?? 4096,
        ...(outputFormat === 'json' ? { response_format: { type: 'json_object' } } : {}),
        thinking: { type: deepseekAnalysis ? 'enabled' : 'disabled' },
        ...(deepseekAnalysis ? { reasoning_effort: 'high' } : {}),
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return {
        content: '',
        model: config.model,
        error: `API error ${response.status}: ${text || response.statusText}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (import.meta.env.DEV && import.meta.env.MODE !== 'test') console.debug('[AI response diagnostic]', JSON.stringify({
      model: data.model,
      outputFormat,
      thinking: deepseekAnalysis ? 'enabled' : 'disabled',
      hasReasoning: typeof data.choices?.[0]?.message?.reasoning_content === 'string' && data.choices[0].message.reasoning_content.length > 0,
      finishReason: data.choices?.[0]?.finish_reason,
      contentType: typeof content,
      contentLength: typeof content === 'string' ? content.length : null,
      nonWhitespaceLength: typeof content === 'string' ? content.trim().length : null,
    }));

    if (typeof content !== 'string') {
      return {
        content: '',
        model: config.model,
        error: 'Unexpected API response format',
      };
    }

    if (data.choices?.[0]?.finish_reason === 'length') {
      return { content: '', model: config.model, error: 'AI 回答达到输出长度上限，未完整返回，请缩短问题后重试。' };
    }
    if (!content.trim()) {
      return { content: '', model: config.model, error: 'AI 服务返回空回答，请重试。' };
    }

    return { content, model: config.model };
  } catch (err) {
    return {
      content: '',
      model: config.model,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
