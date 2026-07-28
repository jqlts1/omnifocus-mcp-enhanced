import { z } from 'zod';
import { getFlaggedTasks } from '../primitives/getFlaggedTasks.js';
import type { ToolHandlerExtra } from './toolHandler.js';

export const schema = z.object({
  hideCompleted: z
    .boolean()
    .optional()
    .describe('Set to false to show completed flagged tasks (default: true)'),
  projectFilter: z
    .string()
    .optional()
    .describe('Filter flagged tasks by project name (optional)'),
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
    const result = await getFlaggedTasks({
      hideCompleted: args.hideCompleted !== false, // Default to true
      projectFilter: args.projectFilter,
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
          text: `Error getting flagged tasks: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
