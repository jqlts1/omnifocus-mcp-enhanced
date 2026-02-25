import { z } from 'zod';
import { renameFolder, RenameFolderParams } from '../primitives/renameFolder.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  id: z.string().optional().describe("The ID of the folder to rename"),
  name: z.string().optional().describe("The current name of the folder to rename (as fallback if ID not provided)"),
  newName: z.string().describe("The new name for the folder")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    // Validate that either id or name is provided
    if (!args.id && !args.name) {
      return {
        content: [{
          type: "text" as const,
          text: "Either id or name must be provided to rename a folder."
        }],
        isError: true
      };
    }

    console.error(`Renaming folder with ID: ${args.id || 'not provided'}, Name: ${args.name || 'not provided'}, New Name: ${args.newName}`);

    const result = await renameFolder(args as RenameFolderParams);

    if (result.success) {
      return {
        content: [{
          type: "text" as const,
          text: `✅ Folder "${result.oldName}" renamed to "${result.newName}" successfully.`
        }]
      };
    } else {
      let errorMsg = 'Failed to rename folder';

      if (result.error) {
        if (result.error.includes("Folder not found")) {
          errorMsg = 'Folder not found';
          if (args.id) errorMsg += ` with ID "${args.id}"`;
          if (args.name) errorMsg += `${args.id ? ' or' : ' with'} name "${args.name}"`;
          errorMsg += '.';
        } else {
          errorMsg += `: ${result.error}`;
        }
      }

      return {
        content: [{
          type: "text" as const,
          text: errorMsg
        }],
        isError: true
      };
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Tool execution error: ${error.message}`);

    return {
      content: [{
        type: "text" as const,
        text: `Error renaming folder: ${error.message}`
      }],
      isError: true
    };
  }
}
