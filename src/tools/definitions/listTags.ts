import type { ToolHandlerExtra } from './toolHandler.js';
import { z } from 'zod';

import { listTags } from '../primitives/listTags.js';

export const schema = z.object({
  includeInactive: z
    .boolean()
    .optional()
    .describe('Include paused/inactive tags (default: true)'),
});

export async function handler(
  args: z.infer<typeof schema>,
  _extra: ToolHandlerExtra,
) {
  try {
    const result = await listTags(args.includeInactive !== false);
    return { content: [{ type: 'text' as const, text: result }] };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      content: [
        { type: 'text' as const, text: `Error listing tags: ${message}` },
      ],
      isError: true,
    };
  }
}
