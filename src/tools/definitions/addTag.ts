import { z } from 'zod';
import { addTag, AddTagParams } from '../primitives/addTag.js';
import type { ToolHandlerExtra } from './toolHandler.js';

export const schema = z.object({
  name: z.string().describe('The name of the tag'),
  parentTagName: z
    .string()
    .optional()
    .describe(
      'The name of the parent tag to nest this tag under (created at the root level if not specified)',
    ),
});

export async function handler(
  args: z.infer<typeof schema>,
  _extra: ToolHandlerExtra,
) {
  try {
    const result = await addTag(args as AddTagParams);

    if (result.success) {
      const locationText = args.parentTagName
        ? `under tag "${args.parentTagName}"`
        : 'at the root level';

      return {
        content: [
          {
            type: 'text' as const,
            text: `✅ Tag "${args.name}" created successfully ${locationText}.\n\nid: ${result.tagId}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to create tag: ${result.error}`,
        },
      ],
      isError: true,
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Tool execution error: ${error.message}`);
    return {
      content: [
        { type: 'text' as const, text: `Error creating tag: ${error.message}` },
      ],
      isError: true,
    };
  }
}
