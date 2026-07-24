import { z } from 'zod';
import { setRepetitionRule } from '../primitives/setRepetitionRule.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  taskId: z.string().describe('The ID of the task to modify'),
  ruleString: z
    .string()
    .optional()
    .describe('ICS recurrence rule string, e.g. FREQ=WEEKLY;INTERVAL=2. Defaults to FREQ=WEEKLY.'),
  scheduleType: z
    .enum(['Regularly', 'FromCompletion'])
    .optional()
    .describe('How the next occurrence is scheduled. Regularly repeats from assigned dates; FromCompletion repeats after completion.'),
  anchorDateKey: z
    .enum(['DueDate', 'DeferDate', 'PlannedDate'])
    .optional()
    .describe('Which date property is advanced when the task repeats.'),
  catchUpAutomatically: z
    .boolean()
    .optional()
    .describe('When true, missed occurrences are skipped and the next future occurrence is created.'),
  endDate: z
    .string()
    .optional()
    .describe('ISO date string for when the repetition ends. Encoded into the rule as UNTIL=.'),
  count: z
    .number()
    .optional()
    .describe('Number of repetitions after which the rule ends. Encoded into the rule as COUNT=.'),
  clear: z
    .boolean()
    .optional()
    .describe('Set to true to remove the repetition rule from the task.'),
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    const result = await setRepetitionRule({
      taskId: args.taskId,
      ruleString: args.ruleString,
      scheduleType: args.scheduleType,
      anchorDateKey: args.anchorDateKey,
      catchUpAutomatically: args.catchUpAutomatically,
      endDate: args.endDate,
      count: args.count,
      clear: args.clear,
    });

    if (!result.success) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Failed to set repetition rule: ${result.error || 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }

    if (result.cleared) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'Repetition rule cleared successfully.',
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: `Repetition rule set successfully.\nRule: ${result.ruleString}\nSchedule: ${result.scheduleType}\nAnchor: ${result.anchorDateKey}\nCatch up automatically: ${result.catchUpAutomatically}`,
        },
      ],
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error setting repetition rule: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
