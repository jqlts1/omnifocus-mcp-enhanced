import { z } from 'zod';
import { getTasksByTag } from '../primitives/getTasksByTag.js';
import type { ToolHandlerExtra } from './toolHandler.js';

export const schema = z.object({
  tagName: z.string().describe('Name of the tag to filter tasks by'),
  hideCompleted: z
    .boolean()
    .optional()
    .describe(
      'Set to false to show completed tasks with this tag (default: true)',
    ),
  exactMatch: z
    .boolean()
    .optional()
    .describe(
      'Set to true for exact tag name match, false for partial (default: false)',
    ),
  showSubtasks: z
    .boolean()
    .optional()
    .describe("Expand each matching task's subtask tree (default: false)"),
  maxSubtaskDepth: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Maximum subtask levels to expand; omitted means unlimited'),
});

export async function handler(
  args: z.infer<typeof schema>,
  extra: ToolHandlerExtra,
) {
  try {
    const result = await getTasksByTag({
      tagName: args.tagName,
      hideCompleted: args.hideCompleted !== false, // Default to true
      exactMatch: args.exactMatch || false,
      showSubtasks: args.showSubtasks === true,
      maxSubtaskDepth: args.maxSubtaskDepth,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: result,
        },
      ],
    };
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error getting tasks by tag: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
