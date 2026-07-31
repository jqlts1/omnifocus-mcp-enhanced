import { z } from 'zod';
import {
  addTaskNotification,
  formatNotification,
  listTaskNotifications,
  removeTaskNotification,
} from '../primitives/taskNotifications.js';
import type { ToolHandlerExtra } from './toolHandler.js';

export const inputSchema = z
  .object({
    action: z
      .enum(['list', 'add', 'remove'])
      .describe('Notification operation to perform.'),
    taskId: z
      .string()
      .min(1)
      .optional()
      .describe('Task ID (preferred identifier).'),
    taskName: z
      .string()
      .min(1)
      .optional()
      .describe('Task name (fallback identifier).'),
    absoluteDate: z
      .string()
      .min(1)
      .optional()
      .describe('ISO 8601 notification time (add only).'),
    relativeMinutes: z
      .number()
      .finite()
      .optional()
      .describe('Minutes relative to the due date; negative is before due (add only).'),
    index: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe('0-based notification index (remove only).'),
    removeAll: z
      .literal(true)
      .optional()
      .describe('Remove every notification (remove only).'),
  })
  .strict();

export const inputShape = inputSchema.shape;

const ACTION_FIELDS: Record<
  z.infer<typeof inputSchema>['action'],
  Record<string, true>
> = {
  list: { action: true, taskId: true, taskName: true },
  add: {
    action: true,
    taskId: true,
    taskName: true,
    absoluteDate: true,
    relativeMinutes: true,
  },
  remove: {
    action: true,
    taskId: true,
    taskName: true,
    index: true,
    removeAll: true,
  },
};

export const schema = inputSchema.superRefine((args, ctx) => {
  if (!args.taskId && !args.taskName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['taskId'],
      message: 'taskId or taskName is required',
    });
  }
  if (
    args.action === 'add' &&
    (args.absoluteDate === undefined) === (args.relativeMinutes === undefined)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['absoluteDate'],
      message: 'provide exactly one of absoluteDate or relativeMinutes when action is add',
    });
  }
  if (
    args.action === 'remove' &&
    (args.index === undefined) === (args.removeAll !== true)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['index'],
      message: 'provide exactly one of index or removeAll: true when action is remove',
    });
  }

  const allowed = ACTION_FIELDS[args.action];
  for (const [key, value] of Object.entries(args)) {
    if (value !== undefined && !allowed[key]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${key} is not valid when action is ${args.action}`,
      });
    }
  }
});

interface NotificationDependencies {
  listTaskNotifications: typeof listTaskNotifications;
  addTaskNotification: typeof addTaskNotification;
  removeTaskNotification: typeof removeTaskNotification;
}

const defaultDependencies: NotificationDependencies = {
  listTaskNotifications,
  addTaskNotification,
  removeTaskNotification,
};

function validationError(error: z.ZodError) {
  return {
    content: [
      {
        type: 'text' as const,
        text: `Invalid manage_task_notifications arguments: ${error.issues
          .map((issue) => issue.message)
          .join('; ')}`,
      },
    ],
    isError: true,
  };
}

export function createHandler(dependencies: NotificationDependencies) {
  return async (rawArgs: z.input<typeof inputSchema>, _extra: ToolHandlerExtra) => {
    const parsed = schema.safeParse(rawArgs);
    if (!parsed.success) return validationError(parsed.error);
    const args = parsed.data;
    const task = { taskId: args.taskId, taskName: args.taskName };

    try {
      switch (args.action) {
        case 'list': {
          const result = await dependencies.listTaskNotifications(task);
          if (!result.success) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `Failed to list notifications: ${result.error}`,
                },
              ],
              isError: true,
            };
          }
          const notifications = result.notifications ?? [];
          if (notifications.length === 0) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `# Notifications for "${result.taskName}"\n\nNo notifications set.`,
                },
              ],
            };
          }
          return {
            content: [
              {
                type: 'text' as const,
                text: `# Notifications for "${result.taskName}" (${notifications.length})\n\n${notifications
                  .map(formatNotification)
                  .join('\n')}`,
              },
            ],
          };
        }
        case 'add': {
          const result = await dependencies.addTaskNotification({
            ...task,
            absoluteDate: args.absoluteDate,
            relativeMinutes: args.relativeMinutes,
          });
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
          const addedText = result.added
            ? formatNotification(result.added)
            : 'notification added';
          return {
            content: [
              {
                type: 'text' as const,
                text: `✅ Added notification to "${result.taskName}".\n${addedText}\n\nTotal notifications: ${(result.notifications ?? []).length}`,
              },
            ],
          };
        }
        case 'remove': {
          const result = await dependencies.removeTaskNotification({
            ...task,
            index: args.index,
            removeAll: args.removeAll === true,
          });
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
          return {
            content: [
              {
                type: 'text' as const,
                text: `✅ Removed ${result.removedCount ?? 0} notification(s) from "${result.taskName}".\n\nRemaining notifications: ${(result.notifications ?? []).length}`,
              },
            ],
          };
        }
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      console.error(`Tool execution error: ${error.message}`);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error in notification ${args.action}: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  };
}

export const handler = createHandler(defaultDependencies);
