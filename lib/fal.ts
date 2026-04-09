import { fal } from '@fal-ai/client';

// Fal.ai 클라이언트 초기화.
// FAL_KEY 환경변수를 .env.local 및 Vercel 환경변수에 등록해둘 것.
if (process.env.FAL_KEY) {
  fal.config({ credentials: process.env.FAL_KEY });
}

export { fal };
