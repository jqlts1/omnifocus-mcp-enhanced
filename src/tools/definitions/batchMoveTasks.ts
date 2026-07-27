import { z } from 'zod';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { batchMoveTasks } from '../primitives/batchMoveTasks.js';

const moveSchema = z.object({
  taskId: z.string().min(1).describe('Stable ID of the task to move'),
  projectId: z.string().min(1).optional().describe('Move the task to this project ID'),
  parentTaskId: z.string().min(1).optional().describe('Move the task under this parent task ID'),
  inbox: z.literal(true).optional().describe('Move the task to the Inbox'),
}).strict().refine(
  move => [move.projectId, move.parentTaskId, move.inbox].filter(value => value !== undefined).length === 1,
  { message: 'Each task must have exactly one destination: projectId, parentTaskId, or inbox: true' },
);

export const schema = z.object({
  moves: z.array(moveSchema).min(1).max(100).superRefine((moves, context) => {
    const seen = new Set<string>();
    moves.forEach((move, index) => {
      if (seen.has(move.taskId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, 'taskId'],
          message: `Duplicate source task ID: ${move.taskId}`,
        });
      }
      seen.add(move.taskId);
    });
  }).describe('Confirmed task moves. The whole batch is preflighted and verified automatically.'),
}).strict();

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    const result = await batchMoveTasks(args.moves);
    if (!result.success || !result.results) {
      return {
        content: [{ type: 'text' as const, text: `Failed to move tasks: ${result.error || 'Unknown error'}` }],
        isError: true,
      };
    }

    const lines = result.results.map(item => {
      const status = item.changed ? 'Moved' : 'Already there';
      return `- ${status}: ${item.taskName} (${item.taskId}) -> ${item.destination.name}`;
    });
    const summary = `Moved and verified ${result.movedCount || 0} task(s)` +
      ((result.unchangedCount || 0) > 0 ? `; ${result.unchangedCount} already at the requested destination` : '');

    return {
      content: [{ type: 'text' as const, text: `${summary}.\n\n${lines.join('\n')}` }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text' as const, text: `Error moving tasks: ${message}` }],
      isError: true,
    };
  }
}
