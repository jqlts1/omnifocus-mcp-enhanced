import { z } from 'zod';
import { listCustomPerspectives } from '../primitives/listCustomPerspectives.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  includeBuiltIn: z.boolean().optional().describe("Include built-in perspectives like Inbox, Flagged (default: false)"),
  includeSidebar: z.boolean().optional().describe("Include sidebar perspectives and folders (default: true)"),
  format: z.enum(["simple", "detailed"]).optional().describe("Output format: simple (names only) or detailed (with metadata)")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    const result = await listCustomPerspectives({
      includeBuiltIn: args.includeBuiltIn || false,
      includeSidebar: args.includeSidebar !== false, // Default to true
      format: args.format || "detailed"
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
        text: `Error listing custom perspectives: ${errorMessage}`
      }],
      isError: true
    };
  }
}