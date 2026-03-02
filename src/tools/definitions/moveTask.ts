import { z } from 'zod';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { moveTask, MoveTaskParams } from '../primitives/moveTask.js';

export const schema = z.object({
  id: z.string().max(200).optional().describe('The ID of the task to move'),
  name: z.string().max(500).optional().describe('The name of the task to move (fallback if ID not provided)'),
  targetProjectId: z.string().max(200).optional().describe('Destination project ID'),
  targetProjectName: z.string().max(500).optional().describe('Destination project name (errors on duplicate names)'),
  targetParentTaskId: z.string().max(200).optional().describe('Destination parent task ID'),
  targetParentTaskName: z.string().max(500).optional().describe('Destination parent task name (errors on duplicate names)'),
  targetInbox: z.boolean().optional().describe('Move task to inbox')
});

function formatDestination(args: z.infer<typeof schema>): string {
  if (args.targetInbox) {
    return 'inbox';
  }

  if (args.targetProjectId || args.targetProjectName) {
    return `project "${args.targetProjectId || args.targetProjectName}"`;
  }

  if (args.targetParentTaskId || args.targetParentTaskName) {
    return `parent task "${args.targetParentTaskId || args.targetParentTaskName}"`;
  }

  return 'destination';
}

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    const result = await moveTask(args as MoveTaskParams);

    if (result.success) {
      return {
        content: [{
          type: 'text' as const,
          text: `✅ Task "${result.name || args.id || args.name}" moved successfully to ${formatDestination(args)}.`
        }]
      };
    }

    return {
      content: [{
        type: 'text' as const,
        text: `Failed to move task: ${result.error}`
      }],
      isError: true
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Tool execution error: ${error.message}`);

    return {
      content: [{
        type: 'text' as const,
        text: `Error moving task: ${error.message}`
      }],
      isError: true
    };
  }
}
