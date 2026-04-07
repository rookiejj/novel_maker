import { NextRequest } from 'next/server';
import getAnthropicClient from '@/lib/anthropic';
import { buildNovelPrompt } from '@/prompts/novelist';
import type { GenerateNovelRequest } from '@/lib/types';
import { NOVEL_LENGTH_MAP } from '@/lib/types';

export const runtime    = 'nodejs';
export const maxDuration = 300;

type SSEEvent = 'chunk' | 'done' | 'error';

function createSSEResponse(): {
  stream: ReadableStream<Uint8Array>;
  send: (event: SSEEvent, data: string) => void;
  close: () => void;
} {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(c) { controller = c; },
  });

  const send = (event: SSEEvent, data: string) => {
    controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify({ text: data })}\n\n`));
  };
  const close = () => controller.close();

  return { stream, send, close };
}

export async function POST(req: NextRequest) {
  const body = await req.json() as GenerateNovelRequest;
  const { config, recentMoods } = body;

  const { stream, send, close } = createSSEResponse();

  (async () => {
    try {
      const anthropic = getAnthropicClient();
      const { system, user } = buildNovelPrompt(config, recentMoods);

      const maxTokens = NOVEL_LENGTH_MAP[config.length].tokens;

      const novelStream = anthropic.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      });

      for await (const event of novelStream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          send('chunk', event.delta.text);
        }
      }

      send('done', '');
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류';
      send('error', message);
    } finally {
      close();
    }
  })();

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  });
}