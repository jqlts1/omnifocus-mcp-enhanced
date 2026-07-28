import { z } from 'zod';
import { addFolder, AddFolderParams } from '../primitives/addFolder.js';
import type { ToolHandlerExtra } from './toolHandler.js';

export const schema = z.object({
  name: z.string().describe('The name of the folder'),
  parentFolderName: z
    .string()
    .optional()
    .describe(
      'The name of the parent folder to nest this folder under (created at the root level if not specified)',
    ),
});

export async function handler(
  args: z.infer<typeof schema>,
  _extra: ToolHandlerExtra,
) {
  try {
    const result = await addFolder(args as AddFolderParams);

    if (result.success) {
      const locationText = args.parentFolderName
        ? `inside folder "${args.parentFolderName}"`
        : 'at the root level';

      return {
        content: [
          {
            type: 'text' as const,
            text: `✅ Folder "${args.name}" created successfully ${locationText}.\n\nid: ${result.folderId}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to create folder: ${result.error}`,
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
          text: `Error creating folder: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}
