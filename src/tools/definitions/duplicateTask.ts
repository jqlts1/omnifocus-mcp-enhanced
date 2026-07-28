import { z } from 'zod';
import {
  duplicateTask,
  DuplicateTaskParams,
} from '../primitives/duplicateTask.js';
import type { ToolHandlerExtra } from './toolHandler.js';

export const schema = z.object({
  taskId: z.string().optional().describe('The ID of the task to duplicate'),
  taskName: z
    .string()
    .optional()
    .describe(
      'The name of the task to duplicate (as fallback if ID not provided)',
    ),
  newName: z
    .string()
    .optional()
    .describe(
      'Optional new name for the duplicated task (keeps the original name if omitted)',
    ),
  includeSubtasks: z
    .boolean()
    .optional()
    .describe(
      "Whether to include the task's subtasks in the copy (default: true)",
    ),
});

export async function handler(
  args: z.infer<typeof schema>,
  _extra: ToolHandlerExtra,
) {
  try {
    if (!args.taskId && !args.taskName) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'Either taskId or taskName must be provided to duplicate a task.',
          },
        ],
        isError: true,
      };
    }

    const result = await duplicateTask(args as DuplicateTaskParams);

    if (result.success) {
      const subtaskText =
        result.childrenCount && result.childrenCount > 0
          ? ` with ${result.childrenCount} subtask(s)`
          : '';
      return {
        content: [
          {
            type: 'text' as const,
            text: `✅ Duplicated task as "${result.name}"${subtaskText}.\n\nid: ${result.newTaskId}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to duplicate task: ${result.error}`,
        },
      ],
      isError: true,
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Tool execution error: ${error.message}`);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error duplicating task: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}
