import { z } from 'zod';
import {
  removeFolder,
  RemoveFolderParams,
} from '../primitives/removeFolder.js';
import type { ToolHandlerExtra } from './toolHandler.js';

export const schema = z.object({
  id: z.string().optional().describe('The ID of the folder to remove'),
  name: z
    .string()
    .optional()
    .describe(
      'The name of the folder to remove (as fallback if ID not provided)',
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
            text: 'Either id or name must be provided to remove a folder.',
          },
        ],
        isError: true,
      };
    }

    const result = await removeFolder(args as RemoveFolderParams);

    if (result.success) {
      const projectCount = result.deletedProjectCount ?? 0;
      const taskCount = result.deletedTaskCount ?? 0;
      const cascadeWarning =
        projectCount > 0 || taskCount > 0
          ? `\n⚠️ This also permanently deleted ${projectCount} contained project(s) and ${taskCount} task(s).`
          : '';

      return {
        content: [
          {
            type: 'text' as const,
            text: `✅ Folder "${result.name}" removed successfully.${cascadeWarning}`,
          },
        ],
      };
    }

    let errorMsg = 'Failed to remove folder';
    if (result.error) {
      if (result.error.includes('Folder not found')) {
        errorMsg = 'Folder not found';
        if (args.id) errorMsg += ` with ID "${args.id}"`;
        if (args.name)
          errorMsg += `${args.id ? ' or' : ' with'} name "${args.name}"`;
        errorMsg += '.';
      } else {
        errorMsg += `: ${result.error}`;
      }
    }

    return {
      content: [{ type: 'text' as const, text: errorMsg }],
      isError: true,
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Tool execution error: ${error.message}`);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error removing folder: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}
