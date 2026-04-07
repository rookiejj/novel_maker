import Anthropic from '@anthropic-ai/sdk';

// 서버 전용 싱글턴 — 클라이언트 번들에 포함되지 않도록 주의
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});