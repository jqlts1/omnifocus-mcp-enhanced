import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { z } from 'zod';

import { listTaskNotifications, formatNotification } from '../primitives/taskNotifications.js';

export const schema = z.object({
  taskId: z.string().optional().describe('The ID of the task'),
  taskName: z.string().optional().describe('The name of the task (as fallback if ID not provided)')
});

export async function handler(args: z.infer<typeof schema>, _extra: RequestHandlerExtra) {
  try {
    if (!args.taskId && !args.taskName) {
      return {
        content: [{ type: 'text' as const, text: 'Either taskId or taskName must be provided.' }],
        isError: true
      };
    }

    const result = await listTaskNotifications(args);

    if (!result.success) {
      return {
        content: [{ type: 'text' as const, text: `Failed to list notifications: ${result.error}` }],
        isError: true
      };
    }

    const notifications = result.notifications || [];
    if (notifications.length === 0) {
      return {
        content: [{
          type: 'text' as const,
          text: `# Notifications for "${result.taskName}"\n\nNo notifications set.`
        }]
      };
    }

    const lines = notifications.map(formatNotification);
    return {
      content: [{
        type: 'text' as const,
        text: `# Notifications for "${result.taskName}" (${notifications.length})\n\n${lines.join('\n')}`
      }]
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Tool execution error: ${error.message}`);
    return {
      content: [{ type: 'text' as const, text: `Error listing notifications: ${error.message}` }],
      isError: true
    };
  }
}
