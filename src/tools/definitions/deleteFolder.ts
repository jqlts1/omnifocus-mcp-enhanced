import { z } from 'zod';
import { deleteFolder, DeleteFolderParams } from '../primitives/deleteFolder.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  id: z.string().optional().describe("The ID of the folder to delete"),
  name: z.string().optional().describe("The name of the folder to delete (as fallback if ID not provided)")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    // Validate that either id or name is provided
    if (!args.id && !args.name) {
      return {
        content: [{
          type: "text" as const,
          text: "Either id or name must be provided to delete a folder."
        }],
        isError: true
      };
    }

    console.error(`Deleting folder with ID: ${args.id || 'not provided'}, Name: ${args.name || 'not provided'}`);

    const result = await deleteFolder(args as DeleteFolderParams);

    if (result.success) {
      return {
        content: [{
          type: "text" as const,
          text: `✅ Folder "${result.name}" deleted successfully.`
        }]
      };
    } else {
      let errorMsg = 'Failed to delete folder';

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
        text: `Error deleting folder: ${error.message}`
      }],
      isError: true
    };
  }
}
