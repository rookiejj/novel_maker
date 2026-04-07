import { NextRequest } from 'next/server';
import { anthropic } from '@/lib/anthropic';
import { buildSystemPrompt } from '@/prompts/novelist';
import { NovelConfig, MoodRecord } from '@/lib/types';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { config, recentMoods } = await req.json() as {
      config: NovelConfig;
      recentMoods: MoodRecord[];
    };

    if (!config) {
      return new Response('config는 필수입니다.', { status: 400 });
    }

    const systemPrompt = buildSystemPrompt({ config, recentMoods: recentMoods ?? [] });

    const stream = await anthropic.messages.stream({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: '오늘의 이야기를 써주세요.' }],
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode('event: done\ndata: {}\n\n'));
        } catch {
          controller.enqueue(encoder.encode('event: error\ndata: {}\n\n'));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('[/api/novel]', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}