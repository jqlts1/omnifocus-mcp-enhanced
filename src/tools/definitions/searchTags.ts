import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { z } from 'zod';

import { searchTags } from '../primitives/searchTags.js';

export const schema = z.object({
  query: z.string().describe('Text to search for in tag names'),
  exactMatch: z.boolean().optional().describe('Require an exact name match (default: false, fuzzy contains match)'),
  includeInactive: z.boolean().optional().describe('Include paused/inactive tags (default: true)')
});

export async function handler(args: z.infer<typeof schema>, _extra: RequestHandlerExtra) {
  try {
    const result = await searchTags(args);
    return { content: [{ type: 'text' as const, text: result }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      content: [{ type: 'text' as const, text: `Error searching tags: ${message}` }],
      isError: true
    };
  }
}
