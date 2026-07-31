import { z } from 'zod';
import { addTag } from '../primitives/addTag.js';
import { editTag } from '../primitives/editTag.js';
import { removeTag } from '../primitives/removeTag.js';
import { listTags } from '../primitives/listTags.js';
import { searchTags } from '../primitives/searchTags.js';
import type { ToolHandlerExtra } from './toolHandler.js';

export const inputSchema = z
  .object({
    action: z
      .enum(['list', 'search', 'add', 'edit', 'remove'])
      .describe('Tag operation to perform.'),
    id: z
      .string()
      .min(1)
      .optional()
      .describe('Tag ID (edit/remove only).'),
    name: z
      .string()
      .min(1)
      .optional()
      .describe('Tag name (required for add; fallback identifier otherwise).'),
    query: z
      .string()
      .min(1)
      .optional()
      .describe('Search text (required for search).'),
    newName: z.string().min(1).optional().describe('New tag name (edit only).'),
    newStatus: z
      .enum(['active', 'onHold', 'dropped'])
      .optional()
      .describe('New tag status (edit only).'),
    parentTagName: z
      .string()
      .min(1)
      .optional()
      .describe('Parent tag name (add only).'),
    newParentTagName: z
      .string()
      .optional()
      .describe('New parent tag name (edit only); use an empty string for root.'),
    exactMatch: z
      .boolean()
      .optional()
      .describe('Require exact name match (search only).'),
    includeInactive: z
      .boolean()
      .optional()
      .describe('Include paused/inactive tags (list/search only).'),
  })
  .strict();

export const inputShape = inputSchema.shape;

const ACTION_FIELDS: Record<
  z.infer<typeof inputSchema>['action'],
  Record<string, true>
> = {
  list: { action: true, includeInactive: true },
  search: {
    action: true,
    query: true,
    exactMatch: true,
    includeInactive: true,
  },
  add: { action: true, name: true, parentTagName: true },
  edit: {
    action: true,
    id: true,
    name: true,
    newName: true,
    newStatus: true,
    newParentTagName: true,
  },
  remove: { action: true, id: true, name: true },
};

export const schema = inputSchema.superRefine((args, ctx) => {
  if (args.action === 'search' && !args.query) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['query'],
      message: 'query is required when action is search',
    });
  }
  if (args.action === 'add' && !args.name) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['name'],
      message: 'name is required when action is add',
    });
  }
  if (
    (args.action === 'edit' || args.action === 'remove') &&
    !args.id &&
    !args.name
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['id'],
      message: `id or name is required when action is ${args.action}`,
    });
  }
  if (
    args.action === 'edit' &&
    args.newName === undefined &&
    args.newStatus === undefined &&
    args.newParentTagName === undefined
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['newName'],
      message:
        'newName, newStatus, or newParentTagName is required when action is edit',
    });
  }

  const allowed = ACTION_FIELDS[args.action];
  for (const [key, value] of Object.entries(args)) {
    if (value !== undefined && !allowed[key]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${key} is not valid when action is ${args.action}`,
      });
    }
  }
});

interface TagDependencies {
  addTag: typeof addTag;
  editTag: typeof editTag;
  removeTag: typeof removeTag;
  listTags: typeof listTags;
  searchTags: typeof searchTags;
}

const defaultDependencies: TagDependencies = {
  addTag,
  editTag,
  removeTag,
  listTags,
  searchTags,
};

function validationError(error: z.ZodError) {
  return {
    content: [
      {
        type: 'text' as const,
        text: `Invalid manage_tags arguments: ${error.issues
          .map((issue) => issue.message)
          .join('; ')}`,
      },
    ],
    isError: true,
  };
}

export function createHandler(dependencies: TagDependencies) {
  return async (rawArgs: z.input<typeof inputSchema>, _extra: ToolHandlerExtra) => {
    const parsed = schema.safeParse(rawArgs);
    if (!parsed.success) return validationError(parsed.error);
    const args = parsed.data;

    try {
      switch (args.action) {
        case 'list': {
          const result = await dependencies.listTags(
            args.includeInactive !== false,
          );
          return { content: [{ type: 'text' as const, text: result }] };
        }
        case 'search': {
          const result = await dependencies.searchTags({
            query: args.query!,
            exactMatch: args.exactMatch,
            includeInactive: args.includeInactive,
          });
          return { content: [{ type: 'text' as const, text: result }] };
        }
        case 'add': {
          const result = await dependencies.addTag({
            name: args.name!,
            parentTagName: args.parentTagName,
          });
          if (!result.success) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `Failed to create tag: ${result.error}`,
                },
              ],
              isError: true,
            };
          }
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
        case 'edit': {
          const result = await dependencies.editTag({
            id: args.id,
            name: args.name,
            newName: args.newName,
            newStatus: args.newStatus,
            newParentTagName: args.newParentTagName,
          });
          if (!result.success) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `Failed to edit tag: ${result.error}`,
                },
              ],
              isError: true,
            };
          }
          return {
            content: [
              {
                type: 'text' as const,
                text: `✅ Tag "${result.name}" updated successfully.\nChanged: ${result.changedProperties || 'nothing'}\n\nid: ${result.id}`,
              },
            ],
          };
        }
        case 'remove': {
          const result = await dependencies.removeTag({
            id: args.id,
            name: args.name,
          });
          if (result.success) {
            const details: string[] = [];
            if ((result.affectedTaskCount ?? 0) > 0) {
              details.push(`removed from ${result.affectedTaskCount} task(s)`);
            }
            if ((result.childTagCount ?? 0) > 0) {
              details.push(`⚠️ also deleted ${result.childTagCount} child tag(s)`);
            }
            const detailText =
              details.length > 0 ? `\n${details.join(', ')}.` : '';
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `✅ Tag "${result.name}" removed successfully.${detailText}\n\nTasks themselves were not deleted.`,
                },
              ],
            };
          }
          let errorMessage = 'Failed to remove tag';
          if (result.error?.includes('Tag not found')) {
            errorMessage = 'Tag not found';
            if (args.id) errorMessage += ` with ID "${args.id}"`;
            if (args.name) {
              errorMessage += `${args.id ? ' or' : ' with'} name "${args.name}"`;
            }
            errorMessage += '.';
          } else if (result.error) {
            errorMessage += `: ${result.error}`;
          }
          return {
            content: [{ type: 'text' as const, text: errorMessage }],
            isError: true,
          };
        }
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
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
  };
}

export const handler = createHandler(defaultDependencies);
