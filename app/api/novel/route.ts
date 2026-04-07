import { NextRequest } from 'next/server';
import { anthropic } from '@/lib/anthropic';
import { buildSystemPrompt } from '@/prompts/novelist';
import { MoodEntry, NovelOptions, StoryBibleEntry } from '@/lib/types';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      mood: MoodEntry;
      moodHistory: MoodEntry[];
      options: NovelOptions;
      storyBibles?: StoryBibleEntry[]; // ← Story Bible 수신
    };

    const { mood, moodHistory, options, storyBibles } = body;

    if (!mood || !options) {
      return new Response('mood와 options는 필수입니다.', { status: 400 });
    }

    const systemPrompt = buildSystemPrompt({
      mood,
      moodHistory: moodHistory ?? [],
      options,
      storyBibles: storyBibles ?? [], // ← 프롬프트에 주입
    });

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
              const data = `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
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