import { z } from 'zod';
import { appendToNote, AppendToNoteParams } from '../primitives/appendToNote.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  id: z.string().optional().describe('The ID of the task or project'),
  name: z.string().optional().describe('The name of the task or project (as fallback if ID not provided)'),
  itemType: z.enum(['task', 'project']).describe("Type of item whose note to append to ('task' or 'project')"),
  text: z.string().describe('The text to append to the existing note'),
  separator: z.string().optional().describe('Separator inserted between the existing note and the new text (default: a newline). Pass an empty string to append with no separator.')
});

export async function handler(args: z.infer<typeof schema>, _extra: RequestHandlerExtra) {
  try {
    if (!args.id && !args.name) {
      return {
        content: [{ type: 'text' as const, text: 'Either id or name must be provided to append to a note.' }],
        isError: true
      };
    }

    const result = await appendToNote(args as AppendToNoteParams);

    if (result.success) {
      const itemTypeLabel = args.itemType === 'task' ? 'Task' : 'Project';
      return {
        content: [{
          type: 'text' as const,
          text: `✅ Appended text to ${itemTypeLabel} "${result.name}" note.\n\nid: ${result.id}`
        }]
      };
    }

    return {
      content: [{ type: 'text' as const, text: `Failed to append to note: ${result.error}` }],
      isError: true
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Tool execution error: ${error.message}`);
    return {
      content: [{ type: 'text' as const, text: `Error appending to note: ${error.message}` }],
      isError: true
    };
  }
}
