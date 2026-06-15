import Anthropic from 'npm:@anthropic-ai/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_URL') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = (language: string) =>
  `Explain what this ${language} code does in 2-3 sentences. Be concise and focus on what it accomplishes, not how it works line by line.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${Deno.env.get('EDGE_FUNCTION_SECRET')}`) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const { code, language, provider = 'claude' } = await req.json();

    if (!code || typeof code !== 'string' || code.length > 50000) {
      return new Response('Invalid code', { status: 400, headers: corsHeaders });
    }

    const codeSnippet = code.slice(0, 5000);
    const userMessage = `\`\`\`${language}\n${codeSnippet}\n\`\`\``;

    if (provider === 'grok') {
      const grokKey = Deno.env.get('GROK_API_KEY');
      if (!grokKey) return new Response('Grok API key not configured', { status: 500, headers: corsHeaders });

      const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${grokKey}`,
        },
        body: JSON.stringify({
          model: 'grok-3-mini',
          max_tokens: 300,
          stream: true,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT(language) },
            { role: 'user', content: userMessage },
          ],
        }),
      });

      if (!grokRes.ok) {
        const err = await grokRes.text();
        console.error('Grok error:', err);
        return new Response('Grok API error', { status: 502, headers: corsHeaders });
      }

      // Forward the SSE stream as plain text chunks
      const readable = new ReadableStream({
        async start(controller) {
          const reader = grokRes.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                const text = parsed.choices?.[0]?.delta?.content;
                if (text) controller.enqueue(new TextEncoder().encode(text));
              } catch { /* skip malformed */ }
            }
          }
          controller.close();
        },
      });

      return new Response(readable, {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // Default: Claude
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) return new Response('Anthropic API key not configured', { status: 500, headers: corsHeaders });

    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const stream = await anthropic.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [
        { role: 'user', content: `${SYSTEM_PROMPT(language)}\n\n${userMessage}` },
      ],
    });

    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text));
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch (error) {
    console.error('Edge Function error:', error);
    return new Response('Internal Server Error', { status: 500, headers: corsHeaders });
  }
});
