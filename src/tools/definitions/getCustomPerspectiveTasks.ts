import { z } from 'zod';
import { getCustomPerspectiveTasks } from '../primitives/getCustomPerspectiveTasks.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  perspectiveName: z.string().describe("Name of the custom perspective to get tasks from"),
  hideCompleted: z.boolean().optional().describe("Set to false to show completed tasks (default: true)"),
  limit: z.number().optional().describe("Maximum number of tasks to return (default: 1000)")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    const result = await getCustomPerspectiveTasks({
      perspectiveName: args.perspectiveName,
      hideCompleted: args.hideCompleted !== false, // Default to true
      limit: args.limit || 1000
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
        text: `Error getting custom perspective tasks: ${errorMessage}`
      }],
      isError: true
    };
  }
}