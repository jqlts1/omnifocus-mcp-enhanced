import type { ToolHandlerExtra } from './toolHandler.js';
import { z } from 'zod';

import {
  addTaskNotification,
  formatNotification,
  AddNotificationParams,
} from '../primitives/taskNotifications.js';

export const schema = z.object({
  taskId: z.string().optional().describe('The ID of the task'),
  taskName: z
    .string()
    .optional()
    .describe('The name of the task (as fallback if ID not provided)'),
  absoluteDate: z
    .string()
    .optional()
    .describe(
      'Absolute notification time in ISO 8601 format (e.g. 2026-03-05T09:00:00). Use this OR relativeMinutes, not both.',
    ),
  relativeMinutes: z
    .number()
    .optional()
    .describe(
      'Minutes relative to the task due date. Negative means before the due date (e.g. -30 = 30 minutes before). Requires the task to have a due date.',
    ),
});

export async function handler(
  args: z.infer<typeof schema>,
  _extra: ToolHandlerExtra,
) {
  try {
    const result = await addTaskNotification(args as AddNotificationParams);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Failed to add notification: ${result.error}`,
          },
        ],
        isError: true,
      };
    }

    const total = (result.notifications || []).length;
    const addedText = result.added
      ? formatNotification(result.added)
      : 'notification added';

    return {
      content: [
        {
          type: 'text' as const,
          text: `✅ Added notification to "${result.taskName}".\n${addedText}\n\nTotal notifications: ${total}`,
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
          text: `Error adding notification: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}
