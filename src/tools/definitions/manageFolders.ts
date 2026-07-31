import { z } from 'zod';
import { addFolder } from '../primitives/addFolder.js';
import { editFolder } from '../primitives/editFolder.js';
import { removeFolder } from '../primitives/removeFolder.js';
import { listFolders } from '../primitives/listFolders.js';
import { getFolder } from '../primitives/getFolder.js';
import type { ToolHandlerExtra } from './toolHandler.js';

export const inputSchema = z
  .object({
    action: z
      .enum(['list', 'get', 'add', 'edit', 'remove'])
      .describe('Folder operation to perform.'),
    id: z
      .string()
      .min(1)
      .optional()
      .describe('Folder ID (get/edit/remove only).'),
    name: z
      .string()
      .min(1)
      .optional()
      .describe('Folder name (required for add; fallback identifier otherwise).'),
    newName: z
      .string()
      .min(1)
      .optional()
      .describe('New folder name (edit only).'),
    parentFolderName: z
      .string()
      .min(1)
      .optional()
      .describe('Parent folder name (add only).'),
    newParentFolderName: z
      .string()
      .optional()
      .describe('New parent folder name (edit only); use an empty string for root.'),
    includeDropped: z
      .boolean()
      .optional()
      .describe('Include dropped folders (default: true; list only).'),
  })
  .strict();

export const inputShape = inputSchema.shape;

const ACTION_FIELDS: Record<
  z.infer<typeof inputSchema>['action'],
  Record<string, true>
> = {
  list: { action: true, includeDropped: true },
  get: { action: true, id: true, name: true },
  add: { action: true, name: true, parentFolderName: true },
  edit: {
    action: true,
    id: true,
    name: true,
    newName: true,
    newParentFolderName: true,
  },
  remove: { action: true, id: true, name: true },
};

export const schema = inputSchema.superRefine((args, ctx) => {
  if (args.action === 'add' && !args.name) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['name'],
      message: 'name is required when action is add',
    });
  }
  if (
    (args.action === 'get' ||
      args.action === 'edit' ||
      args.action === 'remove') &&
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
    args.newParentFolderName === undefined
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['newName'],
      message: 'newName or newParentFolderName is required when action is edit',
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

interface FolderDependencies {
  addFolder: typeof addFolder;
  editFolder: typeof editFolder;
  removeFolder: typeof removeFolder;
  listFolders: typeof listFolders;
  getFolder: typeof getFolder;
}

const defaultDependencies: FolderDependencies = {
  addFolder,
  editFolder,
  removeFolder,
  listFolders,
  getFolder,
};

function validationError(error: z.ZodError) {
  return {
    content: [
      {
        type: 'text' as const,
        text: `Invalid manage_folders arguments: ${error.issues
          .map((issue) => issue.message)
          .join('; ')}`,
      },
    ],
    isError: true,
  };
}

export function createHandler(dependencies: FolderDependencies) {
  return async (rawArgs: z.input<typeof inputSchema>, _extra: ToolHandlerExtra) => {
    const parsed = schema.safeParse(rawArgs);
    if (!parsed.success) return validationError(parsed.error);
    const args = parsed.data;

    try {
      switch (args.action) {
        case 'list': {
          const result = await dependencies.listFolders(
            args.includeDropped !== false,
          );
          return { content: [{ type: 'text' as const, text: result }] };
        }
        case 'get': {
          const folder = await dependencies.getFolder({
            id: args.id,
            name: args.name,
          });
          const lines: string[] = [
            `# Folder: ${folder.name}`,
            '',
            `- id: ${folder.id}`,
            `- status: ${folder.status}`,
          ];
          if (folder.parentFolderID) {
            lines.push(`- parent folder id: ${folder.parentFolderID}`);
          }
          lines.push('', `## Subfolders (${folder.subfolders.length})`);
          if (folder.subfolders.length === 0) {
            lines.push('None');
          } else {
            for (const subfolder of folder.subfolders) {
              lines.push(
                `- ${subfolder.name} [${subfolder.status}] (id:${subfolder.id})`,
              );
            }
          }
          lines.push('', `## Projects (${folder.projects.length})`);
          if (folder.projects.length === 0) {
            lines.push('None');
          } else {
            for (const project of folder.projects) {
              lines.push(
                `- ${project.name} [${project.status}] (id:${project.id}, remaining:${project.remainingTaskCount})`,
              );
            }
          }
          return {
            content: [{ type: 'text' as const, text: lines.join('\n') }],
          };
        }
        case 'add': {
          const result = await dependencies.addFolder({
            name: args.name!,
            parentFolderName: args.parentFolderName,
          });
          if (!result.success) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `Failed to create folder: ${result.error}`,
                },
              ],
              isError: true,
            };
          }
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
        case 'edit': {
          const result = await dependencies.editFolder({
            id: args.id,
            name: args.name,
            newName: args.newName,
            newParentFolderName: args.newParentFolderName,
          });
          if (!result.success) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `Failed to edit folder: ${result.error}`,
                },
              ],
              isError: true,
            };
          }
          return {
            content: [
              {
                type: 'text' as const,
                text: `✅ Folder "${result.name}" updated successfully.\nChanged: ${result.changedProperties || 'nothing'}\n\nid: ${result.id}`,
              },
            ],
          };
        }
        case 'remove': {
          const result = await dependencies.removeFolder({
            id: args.id,
            name: args.name,
          });
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
          let errorMessage = 'Failed to remove folder';
          if (result.error?.includes('Folder not found')) {
            errorMessage = 'Folder not found';
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
            text: `Error in folder ${args.action}: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  };
}

export const handler = createHandler(defaultDependencies);
