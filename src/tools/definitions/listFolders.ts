import type { ToolHandlerExtra } from './toolHandler.js';
import { z } from 'zod';

import { listFolders } from '../primitives/listFolders.js';

export const schema = z.object({
  includeDropped: z
    .boolean()
    .optional()
    .describe('Include dropped folders (default: true)'),
});

export async function handler(
  args: z.infer<typeof schema>,
  _extra: ToolHandlerExtra,
) {
  try {
    const result = await listFolders(args.includeDropped !== false);
    return { content: [{ type: 'text' as const, text: result }] };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      content: [
        { type: 'text' as const, text: `Error listing folders: ${message}` },
      ],
      isError: true,
    };
  }
}
