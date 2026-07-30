import { z } from 'zod';
import { addTag, AddTagParams } from '../primitives/addTag.js';
import { editTag, EditTagParams } from '../primitives/editTag.js';
import { removeTag, RemoveTagParams } from '../primitives/removeTag.js';
import { listTags } from '../primitives/listTags.js';
import { searchTags } from '../primitives/searchTags.js';
import type { ToolHandlerExtra } from './toolHandler.js';

export const schema = z.object({
  action: z
    .enum(['list', 'search', 'add', 'edit', 'remove'])
    .describe('The tag operation to perform'),
  id: z
    .string()
    .optional()
    .describe('Tag ID (required for edit/remove when name is not provided)'),
  name: z
    .string()
    .optional()
    .describe('Tag name (required for add; fallback identifier for edit/remove)'),
  query: z
    .string()
    .optional()
    .describe('Search text for tag names (required for search)'),
  newName: z
    .string()
    .optional()
    .describe('New name for the tag (only for edit)'),
  newStatus: z
    .enum(['active', 'onHold', 'dropped'])
    .optional()
    .describe("New status: 'active', 'onHold', or 'dropped' (only for edit)"),
  parentTagName: z
    .string()
    .optional()
    .describe(
      'Parent tag name. For add: nest under this tag. For edit: move to this tag. Use "" to move to root.',
    ),
  exactMatch: z
    .boolean()
    .optional()
    .describe('Require exact name match (default: false, for search)'),
  includeInactive: z
    .boolean()
    .optional()
    .describe('Include paused/inactive tags (default: true, for list/search)'),
});

export async function handler(
  args: z.infer<typeof schema>,
  _extra: ToolHandlerExtra,
) {
  try {
    switch (args.action) {
      case 'list': {
        const result = await listTags(args.includeInactive !== false);
        return { content: [{ type: 'text' as const, text: result }] };
      }

      case 'search': {
        if (!args.query) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'query is required to search tags.',
              },
            ],
            isError: true,
          };
        }
        const result = await searchTags({
          query: args.query,
          exactMatch: args.exactMatch,
          includeInactive: args.includeInactive,
        });
        return { content: [{ type: 'text' as const, text: result }] };
      }

      case 'add': {
        if (!args.name) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'name is required to add a tag.',
              },
            ],
            isError: true,
          };
        }
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
            { type: 'text' as const, text: `Failed to create tag: ${result.error}` },
          ],
          isError: true,
        };
      }

      case 'edit': {
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
      }

      case 'remove': {
        if (!args.id && !args.name) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Either id or name must be provided to remove a tag.',
              },
            ],
            isError: true,
          };
        }
        const result = await removeTag(args as RemoveTagParams);
        if (result.success) {
          const taskCount = result.affectedTaskCount ?? 0;
          const childCount = result.childTagCount ?? 0;
          const details: string[] = [];
          if (taskCount > 0) details.push(`removed from ${taskCount} task(s)`);
          if (childCount > 0)
            details.push(`⚠️ also deleted ${childCount} child tag(s)`);
          const detailText = details.length > 0 ? `\n${details.join(', ')}.` : '';
          return {
            content: [
              {
                type: 'text' as const,
                text: `✅ Tag "${result.name}" removed successfully.${detailText}\n\nTasks themselves were not deleted.`,
              },
            ],
          };
        }
        let errorMsg = 'Failed to remove tag';
        if (result.error) {
          if (result.error.includes('Tag not found')) {
            errorMsg = 'Tag not found';
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
      }
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Tool execution error: ${error.message}`);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error in tag ${args.action}: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}
