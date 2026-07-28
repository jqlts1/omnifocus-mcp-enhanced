import type { ToolHandlerExtra } from './toolHandler.js';
import { z } from 'zod';

import {
  removeTaskNotification,
  RemoveNotificationParams,
} from '../primitives/taskNotifications.js';

export const schema = z.object({
  taskId: z.string().optional().describe('The ID of the task'),
  taskName: z
    .string()
    .optional()
    .describe('The name of the task (as fallback if ID not provided)'),
  index: z
    .number()
    .optional()
    .describe(
      '0-based index of the notification to remove (see list_task_notifications)',
    ),
  removeAll: z
    .boolean()
    .optional()
    .describe('Remove all notifications on the task (default: false)'),
});

export async function handler(
  args: z.infer<typeof schema>,
  _extra: ToolHandlerExtra,
) {
  try {
    const result = await removeTaskNotification(
      args as RemoveNotificationParams,
    );

    if (!result.success) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Failed to remove notification: ${result.error}`,
          },
        ],
        isError: true,
      };
    }

    const removedCount = result.removedCount ?? 0;
    const remaining = (result.notifications || []).length;

    return {
      content: [
        {
          type: 'text' as const,
          text: `✅ Removed ${removedCount} notification(s) from "${result.taskName}".\n\nRemaining notifications: ${remaining}`,
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
          text: `Error removing notification: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}
