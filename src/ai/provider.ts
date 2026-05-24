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

export async function callAI(
  config: AIProviderConfig,
  messages: { role: 'system' | 'user'; content: string }[],
  temperature?: number,
  maxTokens?: number,
): Promise<AIResponse> {
  const url = config.endpoint.replace(/\/+$/, '') + '/v1/chat/completions';

  try {
    const response = await fetch(url, {
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
        response_format: {
          type: 'json_object'
        },
        thinking: {
          type: "disabled"
        }
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

    if (typeof content !== 'string') {
      return {
        content: '',
        model: config.model,
        error: 'Unexpected API response format',
      };
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
