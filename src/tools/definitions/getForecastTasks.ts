import { z } from 'zod';
import { getForecastTasks } from '../primitives/getForecastTasks.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  days: z.number().min(1).max(30).optional().describe("Number of days to look ahead for forecast (default: 7)"),
  hideCompleted: z.boolean().optional().describe("Set to false to show completed tasks in forecast (default: true)"),
  includeDeferredOnly: z.boolean().optional().describe("Set to true to show only deferred tasks becoming available (default: false)")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    const result = await getForecastTasks({
      days: args.days || 7,
      hideCompleted: args.hideCompleted !== false, // Default to true
      includeDeferredOnly: args.includeDeferredOnly || false
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
        text: `Error getting forecast tasks: ${errorMessage}`
      }],
      isError: true
    };
  }
}