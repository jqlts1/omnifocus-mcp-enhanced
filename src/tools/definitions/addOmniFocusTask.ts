import { z } from 'zod';
import {
  addOmniFocusTask,
  AddOmniFocusTaskParams,
} from '../primitives/addOmniFocusTask.js';
import type { ToolHandlerExtra } from './toolHandler.js';

export const schema = z.object({
  name: z.string().describe('The name of the task'),
  note: z.string().optional().describe('Additional notes for the task'),
  dueDate: z
    .string()
    .optional()
    .describe(
      'The due date of the task in ISO format (YYYY-MM-DD or full ISO date)',
    ),
  deferDate: z
    .string()
    .optional()
    .describe(
      'The defer date of the task in ISO format (YYYY-MM-DD or full ISO date)',
    ),
  plannedDate: z
    .string()
    .optional()
    .describe(
      'The planned date of the task in ISO format (YYYY-MM-DD or full ISO date)',
    ),
  flagged: z
    .boolean()
    .optional()
    .describe('Whether the task is flagged or not'),
  estimatedMinutes: z
    .number()
    .optional()
    .describe('Estimated time to complete the task, in minutes'),
  tags: z.array(z.string()).optional().describe('Tags to assign to the task'),
  exclusiveTags: z
    .boolean()
    .optional()
    .describe(
      'Respect mutually exclusive tag groups when applying tags (default: true). When a tag belongs to an exclusive group, sibling tags from that group are removed.',
    ),
  projectName: z
    .string()
    .optional()
    .describe(
      'The name of the project to add the task to (will add to inbox if not specified)',
    ),
  parentTaskId: z
    .string()
    .optional()
    .describe('The ID of the parent task to create this task as a subtask'),
  parentTaskName: z
    .string()
    .optional()
    .describe(
      'The name of the parent task to create this task as a subtask (alternative to parentTaskId)',
    ),
  repetition: z
    .object({
      ruleString: z
        .string()
        .min(1)
        .describe(
          'ICS recurrence rule, e.g. FREQ=WEEKLY;BYDAY=FR. Encode UNTIL/COUNT here.',
        ),
      scheduleType: z
        .enum(['Regularly', 'FromCompletion'])
        .optional()
        .describe(
          'How the next occurrence is scheduled; omitted uses the OmniFocus default.',
        ),
      anchorDateKey: z
        .enum(['DueDate', 'DeferDate', 'PlannedDate'])
        .optional()
        .describe('Which date advances when the task repeats.'),
      catchUpAutomatically: z
        .boolean()
        .optional()
        .describe('Skip missed occurrences when the task is resolved.'),
    })
    .strict()
    .optional()
    .describe(
      'Recurrence applied and verified after creation. Verification failure removes the created task.',
    ),
});

export async function handler(
  args: z.infer<typeof schema>,
  extra: ToolHandlerExtra,
) {
  try {
    // Call the addOmniFocusTask function
    const result = await addOmniFocusTask(args as AddOmniFocusTaskParams);

    if (result.success) {
      // Task was added successfully
      let locationText;
      if (args.parentTaskId || args.parentTaskName) {
        const parentRef = args.parentTaskId || args.parentTaskName;
        locationText = `as a subtask of "${parentRef}"`;
      } else if (args.projectName) {
        locationText = `in project "${args.projectName}"`;
      } else {
        locationText = 'in your inbox';
      }

      let tagText =
        args.tags && args.tags.length > 0
          ? ` with tags: ${args.tags.join(', ')}`
          : '';

      let dueDateText = args.dueDate
        ? ` due on ${new Date(args.dueDate).toLocaleDateString()}`
        : '';

      let plannedDateText = args.plannedDate
        ? ` planned for ${new Date(args.plannedDate).toLocaleDateString()}`
        : '';

      let exclusivityText =
        result.removedSiblings && result.removedSiblings.length > 0
          ? `\nRemoved mutually exclusive tags: ${result.removedSiblings.join(', ')}`
          : '';
      const repetitionText = result.repetition
        ? `\nRepeats: ${result.repetition.ruleString} (${result.repetition.scheduleType}, anchor ${result.repetition.anchorDateKey})` +
          (result.repetition.nextOccurrence
            ? `\nNext occurrence: ${new Date(result.repetition.nextOccurrence).toLocaleString()}`
            : '')
        : '';

      return {
        content: [
          {
            type: 'text' as const,
            text: `✅ Task "${args.name}" created successfully ${locationText}${dueDateText}${plannedDateText}${tagText}.\n\nid: ${result.taskId}${exclusivityText}${repetitionText}`,
          },
        ],
      };
    } else {
      // Task creation failed
      return {
        content: [
          {
            type: 'text' as const,
            text: `Failed to create task${result.code ? ` [${result.code}]` : ''}: ${result.error}`,
          },
        ],
        isError: true,
      };
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Tool execution error: ${error.message}`);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error creating task: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}
