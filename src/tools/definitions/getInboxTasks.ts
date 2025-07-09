import { z } from 'zod';
import { getInboxTasks } from '../primitives/getInboxTasks.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  hideCompleted: z.boolean().optional().describe("Set to false to show completed tasks in inbox (default: true)")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    const result = await getInboxTasks({
      hideCompleted: args.hideCompleted !== false // Default to true
    });
    
    return {
      content: [{
        type: "text" as const,
        text: result
      }]
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      content: [{
        type: "text" as const,
        text: `Error getting inbox tasks: ${errorMessage}`
      }],
      isError: true
    };
  }
}