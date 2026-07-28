import { z } from 'zod';
import { editFolder, EditFolderParams } from '../primitives/editFolder.js';
import type { ToolHandlerExtra } from './toolHandler.js';

export const schema = z.object({
  id: z.string().optional().describe('The ID of the folder to edit'),
  name: z
    .string()
    .optional()
    .describe(
      'The name of the folder to edit (as fallback if ID not provided)',
    ),
  newName: z.string().optional().describe('New name for the folder'),
  newParentFolderName: z
    .string()
    .optional()
    .describe(
      'Move the folder under this parent folder. Use an empty string "" to move it to the root level.',
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
            text: 'Either id or name must be provided to edit a folder.',
          },
        ],
        isError: true,
      };
    }

    const result = await editFolder(args as EditFolderParams);

    if (result.success) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `✅ Folder "${result.name}" updated successfully.\nChanged: ${result.changedProperties || 'nothing'}\n\nid: ${result.id}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to edit folder: ${result.error}`,
        },
      ],
      isError: true,
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Tool execution error: ${error.message}`);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error editing folder: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}
