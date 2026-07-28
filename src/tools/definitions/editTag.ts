import { z } from 'zod';
import { editTag, EditTagParams } from '../primitives/editTag.js';
import type { ToolHandlerExtra } from './toolHandler.js';

export const schema = z.object({
  id: z.string().optional().describe('The ID of the tag to edit'),
  name: z
    .string()
    .optional()
    .describe('The name of the tag to edit (as fallback if ID not provided)'),
  newName: z.string().optional().describe('New name for the tag'),
  newStatus: z
    .enum(['active', 'onHold', 'dropped'])
    .optional()
    .describe(
      "New status: 'active' (available), 'onHold' (does not allow next actions), or 'dropped' (hidden)",
    ),
  newParentTagName: z
    .string()
    .optional()
    .describe(
      'Move the tag under this parent tag. Use an empty string "" to move it to the root level.',
    ),
});

export async function handler(
  args: z.infer<typeof schema>,
  _extra: ToolHandlerExtra,
) {
  try {
    if (!args.id && !args.name) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'Either id or name must be provided to edit a tag.',
          },
        ],
        isError: true,
      };
    }

    const result = await editTag(args as EditTagParams);

    if (result.success) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `✅ Tag "${result.name}" updated successfully.\nChanged: ${result.changedProperties || 'nothing'}\n\nid: ${result.id}`,
          },
        ],
      };
    }

    return {
      content: [
        { type: 'text' as const, text: `Failed to edit tag: ${result.error}` },
      ],
      isError: true,
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Tool execution error: ${error.message}`);
    return {
      content: [
        { type: 'text' as const, text: `Error editing tag: ${error.message}` },
      ],
      isError: true,
    };
  }
}
