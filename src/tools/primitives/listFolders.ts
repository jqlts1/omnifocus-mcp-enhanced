import { executeOmniFocusScript } from '../../utils/scriptExecution.js';

export interface OmniFocusFolderSummary {
  id: string;
  name: string;
  parentFolderID: string | null;
  status: string;
  projectCount: number;
}

interface ListFoldersResult {
  success: boolean;
  count: number;
  folders: OmniFocusFolderSummary[];
  error?: string;
}

function parseListFoldersResult(result: unknown): ListFoldersResult {
  const data = typeof result === 'string' ? JSON.parse(result) : result;
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid list_folders response');
  }

  const response = data as Partial<ListFoldersResult>;
  if (response.success !== true) {
    throw new Error(response.error || 'Unable to list OmniFocus folders');
  }
  if (!Array.isArray(response.folders)) {
    throw new Error('Invalid list_folders response: folders must be an array');
  }

  return {
    success: true,
    count: response.folders.length,
    folders: response.folders
  };
}

export async function listFolders(includeDropped = true): Promise<string> {
  const result = await executeOmniFocusScript('@listFolders.js', { includeDropped });
  const data = parseListFoldersResult(result);

  if (data.folders.length === 0) {
    return '# OmniFocus Folders\n\nNo folders found.';
  }

  const lines = data.folders.map(folder => {
    const parent = folder.parentFolderID ? ` parent:${folder.parentFolderID}` : '';
    return `- ${folder.name} [${folder.status}] (id:${folder.id}${parent}, projects:${folder.projectCount})`;
  });

  return `# OmniFocus Folders (${data.count})\n\n${lines.join('\n')}`;
}

export { parseListFoldersResult };
