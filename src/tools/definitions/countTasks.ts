import { z } from 'zod';
import { countTasks, CountTasksOptions } from '../primitives/countTasks.js';
import type { ToolHandlerExtra } from './toolHandler.js';

export const schema = z.object({
  taskStatus: z
    .array(z.string())
    .optional()
    .describe(
      'Filter by task status: Available, Next, Blocked, DueSoon, Overdue, Completed, Dropped',
    ),
  perspective: z
    .enum(['inbox', 'flagged', 'all'])
    .optional()
    .describe("Scope: 'inbox', 'flagged', or 'all' (default: all)"),
  projectFilter: z
    .string()
    .optional()
    .describe('Only count tasks in projects whose name contains this text'),
  tagFilter: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe('Only count tasks with these tags'),
  exactTagMatch: z
    .boolean()
    .optional()
    .describe('Require exact tag name match (default: false)'),
  flagged: z
    .boolean()
    .optional()
    .describe('Only count flagged (true) or unflagged (false) tasks'),
  searchText: z
    .string()
    .optional()
    .describe('Only count tasks whose name or note contains this text'),
  dueToday: z.boolean().optional().describe('Only count tasks due today'),
  dueThisWeek: z
    .boolean()
    .optional()
    .describe('Only count tasks due this week'),
  overdue: z.boolean().optional().describe('Only count overdue tasks'),
  completedToday: z
    .boolean()
    .optional()
    .describe('Only count tasks completed today'),
  completedThisWeek: z
    .boolean()
    .optional()
    .describe('Only count tasks completed this week'),
  plannedToday: z
    .boolean()
    .optional()
    .describe('Only count tasks planned for today'),
  plannedThisWeek: z
    .boolean()
    .optional()
    .describe('Only count tasks planned for this week'),
});

export async function handler(
  args: z.infer<typeof schema>,
  _extra: ToolHandlerExtra,
) {
  try {
    const result = await countTasks(args as CountTasksOptions);

    const statusEntries = Object.entries(result.byStatus).sort(
      (a, b) => b[1] - a[1],
    );
    const breakdown =
      statusEntries.length > 0
        ? statusEntries
            .map(([status, count]) => `- ${status}: ${count}`)
            .join('\n')
        : '- (no matching tasks)';

    return {
      content: [
        {
          type: 'text' as const,
          text: `# Task Count\n\n**Total: ${result.total}**\n\nBy status:\n${breakdown}`,
        },
      ],
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Tool execution error: ${error.message}`);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error counting tasks: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}
