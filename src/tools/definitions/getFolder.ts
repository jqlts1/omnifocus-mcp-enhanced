import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { z } from 'zod';

import { getFolder } from '../primitives/getFolder.js';

export const schema = z.object({
  id: z.string().optional().describe('The ID of the folder to get'),
  name: z.string().optional().describe('The name of the folder to get (as fallback if ID not provided)')
});

export async function handler(args: z.infer<typeof schema>, _extra: RequestHandlerExtra) {
  try {
    if (!args.id && !args.name) {
      return {
        content: [{ type: 'text' as const, text: 'Either id or name must be provided to get a folder.' }],
        isError: true
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
        lines.push(`- ${project.name} [${project.status}] (id:${project.id}, remaining:${project.remainingTaskCount})`);
      }
    }

    return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      content: [{ type: 'text' as const, text: `Error getting folder: ${message}` }],
      isError: true
    };
  }
}
