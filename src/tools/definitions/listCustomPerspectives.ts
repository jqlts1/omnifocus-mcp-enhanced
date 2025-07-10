import { z } from 'zod';
import { listCustomPerspectives } from '../primitives/listCustomPerspectives.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  format: z.enum(['simple', 'detailed']).optional().describe("Output format: simple (names only) or detailed (with identifiers) - default: simple")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    const result = await listCustomPerspectives({
      format: args.format || 'simple'
    });
    
    return {
      content: [{
        type: "text" as const,
        text: result
      }]
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      content: [{
        type: "text" as const,
        text: `Error listing custom perspectives: ${errorMessage}`
      }],
      isError: true
    };
  }
}