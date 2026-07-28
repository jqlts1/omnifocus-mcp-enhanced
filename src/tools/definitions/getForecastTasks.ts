import { z } from 'zod';
import { getForecastTasks } from '../primitives/getForecastTasks.js';
import type { ToolHandlerExtra } from './toolHandler.js';

export const schema = z.object({
  days: z
    .number()
    .min(1)
    .max(30)
    .optional()
    .describe('Number of days to look ahead for forecast (default: 7)'),
  hideCompleted: z
    .boolean()
    .optional()
    .describe(
      'Set to false to show completed tasks in forecast (default: true)',
    ),
  includeDeferredOnly: z
    .boolean()
    .optional()
    .describe(
      'Set to true to show only deferred tasks becoming available (default: false)',
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
    const result = await getForecastTasks({
      days: args.days || 7,
      hideCompleted: args.hideCompleted !== false, // Default to true
      includeDeferredOnly: args.includeDeferredOnly || false,
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
          text: `Error getting forecast tasks: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
