import { z } from 'zod';
import { getCustomPerspective } from '../primitives/getCustomPerspective.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  name: z.string().optional().describe("Name of the custom perspective to query"),
  perspectiveId: z.string().optional().describe("ID of the custom perspective to query (alternative to name)"),
  hideCompleted: z.boolean().optional().describe("Hide completed and dropped tasks (default: true)"),
  limit: z.number().max(500).optional().describe("Maximum number of tasks to return (default: 100)")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    // Validate that either name or perspectiveId is provided
    if (!args.name && !args.perspectiveId) {
      throw new Error("Either 'name' or 'perspectiveId' must be provided");
    }
    
    const result = await getCustomPerspective({
      perspectiveName: args.name,
      perspectiveId: args.perspectiveId,
      hideCompleted: args.hideCompleted !== false, // Default to true
      limit: args.limit || 100
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
        text: `Error getting custom perspective: ${errorMessage}`
      }],
      isError: true
    };
  }
}