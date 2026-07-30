import { z } from 'zod';
import { addFolder, AddFolderParams } from '../primitives/addFolder.js';
import { editFolder, EditFolderParams } from '../primitives/editFolder.js';
import { removeFolder, RemoveFolderParams } from '../primitives/removeFolder.js';
import { listFolders } from '../primitives/listFolders.js';
import { getFolder } from '../primitives/getFolder.js';
import type { ToolHandlerExtra } from './toolHandler.js';

export const schema = z.object({
  action: z
    .enum(['list', 'get', 'add', 'edit', 'remove'])
    .describe('The folder operation to perform'),
  id: z
    .string()
    .optional()
    .describe('Folder ID (required for get/edit/remove when name is not provided)'),
  name: z
    .string()
    .optional()
    .describe('Folder name (required for add; fallback identifier for get/edit/remove)'),
  newName: z
    .string()
    .optional()
    .describe('New name for the folder (only for edit)'),
  parentFolderName: z
    .string()
    .optional()
    .describe(
      'Parent folder name. For add: nest under this folder. For edit: move to this folder. Use "" to move to root.',
    ),
  includeDropped: z
    .boolean()
    .optional()
    .describe('Include dropped folders in list (default: true)'),
});

export async function handler(
  args: z.infer<typeof schema>,
  _extra: ToolHandlerExtra,
) {
  try {
    switch (args.action) {
      case 'list': {
        const result = await listFolders(args.includeDropped !== false);
        return { content: [{ type: 'text' as const, text: result }] };
      }

      case 'get': {
        if (!args.id && !args.name) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Either id or name must be provided to get a folder.',
              },
            ],
            isError: true,
          };
        }
        const folder = await getFolder({ id: args.id, name: args.name });
        const lines: string[] = [];
        lines.push(`# Folder: ${folder.name}`);
        lines.push('');
        lines.push(`- id: ${folder.id}`);
        lines.push(`- status: ${folder.status}`);
        if (folder.parentFolderID) {
          lines.push(`- parent folder id: ${folder.parentFolderID}`);
        }
        lines.push('');
        lines.push(`## Subfolders (${folder.subfolders.length})`);
        if (folder.subfolders.length === 0) {
          lines.push('None');
        } else {
          for (const sub of folder.subfolders) {
            lines.push(`- ${sub.name} [${sub.status}] (id:${sub.id})`);
          }
        }
        lines.push('');
        lines.push(`## Projects (${folder.projects.length})`);
        if (folder.projects.length === 0) {
          lines.push('None');
        } else {
          for (const project of folder.projects) {
            lines.push(
              `- ${project.name} [${project.status}] (id:${project.id}, remaining:${project.remainingTaskCount})`,
            );
          }
        }
        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      }

      case 'add': {
        if (!args.name) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'name is required to add a folder.',
              },
            ],
            isError: true,
          };
        }
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
            { type: 'text' as const, text: `Failed to create folder: ${result.error}` },
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
            { type: 'text' as const, text: `Failed to edit folder: ${result.error}` },
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
            if (args.name) errorMsg += `${args.id ? ' or' : ' with'} name "${args.name}"`;
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
          text: `Error in folder ${args.action}: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}
