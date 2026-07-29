import { z } from 'zod';
import {
  batchCompleteTasks,
  type BatchCompleteTasksParams,
} from '../primitives/batchCompleteTasks.js';
import type { ToolHandlerExtra } from './toolHandler.js';

export const schema = z
  .object({
    items: z
      .array(
        z
          .object({
            taskId: z
              .string()
              .min(1)
              .describe('Stable OmniFocus task ID'),
            action: z
              .enum(['complete', 'incomplete'])
              .describe('Mark the task complete or incomplete'),
            completionDate: z
              .string()
              .optional()
              .describe(
                'ISO 8601 date-time for completion; only valid with action=complete; omitted uses now',
              ),
          })
          .strict(),
      )
      .min(1)
      .max(100)
      .describe('Tasks to complete or mark incomplete'),
  })
  .strict();

export async function handler(
  args: z.infer<typeof schema>,
  extra: ToolHandlerExtra,
) {
  const result = await batchCompleteTasks(args as BatchCompleteTasksParams);

  if (!result.success) {
    const restored = result.restored ? '\nPrevious states restored.' : '';
    const residual = result.residualTaskIds?.length
      ? `\nResidual task IDs: ${result.residualTaskIds.join(', ')}`
      : '';
    const recovery = result.recovery ? `\n${result.recovery}` : '';
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to complete tasks [${result.code || 'COMPLETION_FAILED'}]: ${result.error || 'Unknown error'}${restored}${residual}${recovery}`,
        },
      ],
      isError: true,
    };
  }

  const completed = result.items?.filter((item) => item.status === 'completed')
    .length;
  const incompleted = result.items?.filter(
    (item) => item.status === 'incompleted',
  ).length;
  const unchanged = result.items?.filter((item) => item.status === 'unchanged')
    .length;
  const generated = result.items?.filter((item) => item.generatedTaskId)
    .length;

  let summary = `✅ Batch completed ${result.items?.length || 0} task(s):`;
  if (completed) summary += ` ${completed} marked complete`;
  if (incompleted)
    summary += `${completed ? ',' : ''} ${incompleted} marked incomplete`;
  if (unchanged) summary += `${completed || incompleted ? ',' : ''} ${unchanged} unchanged`;
  if (generated) summary += `\n⟳ ${generated} repeating task(s) generated new instances`;

  const details = result.items
    ?.map((item, index) => {
      const action = item.status === 'completed' ? '✓' : item.status === 'incompleted' ? '○' : '—';
      let line = `${index + 1}. ${action} ${item.taskId}`;
      if (item.completionDate)
        line += ` (completed ${new Date(item.completionDate).toLocaleString()})`;
      if (item.generatedTaskId)
        line += `\n   ⟳ Generated: ${item.generatedTaskId}`;
      if (item.nextOccurrence)
        line += ` → ${new Date(item.nextOccurrence).toLocaleString()}`;
      return line;
    })
    .join('\n');

  return {
    content: [
      {
        type: 'text' as const,
        text: `${summary}\n\n${details}`,
      },
    ],
  };
}
