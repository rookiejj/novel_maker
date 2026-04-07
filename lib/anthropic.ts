import Anthropic from '@anthropic-ai/sdk';

// Server-only singleton — never import this in client components
const getAnthropicClient = (() => {
  let client: Anthropic | null = null;
  return () => {
    if (!client) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
      client = new Anthropic({ apiKey });
    }
    return client;
  };
})();

export default getAnthropicClient;