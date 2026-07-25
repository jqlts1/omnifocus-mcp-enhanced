import { executeOmniFocusScript } from '../../utils/scriptExecution.js';

export interface FolderChildProject {
  id: string;
  name: string;
  status: string;
  remainingTaskCount: number;
}

export interface FolderChildFolder {
  id: string;
  name: string;
  status: string;
}

export interface OmniFocusFolderDetail {
  id: string;
  name: string;
  parentFolderID: string | null;
  status: string;
  projects: FolderChildProject[];
  subfolders: FolderChildFolder[];
}

interface GetFolderResult {
  success: boolean;
  folder?: OmniFocusFolderDetail;
  error?: string;
}

function parseGetFolderResult(result: unknown): GetFolderResult {
  const data = typeof result === 'string' ? JSON.parse(result) : result;
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid get_folder response');
  }

  const response = data as Partial<GetFolderResult>;
  if (response.success !== true) {
    throw new Error(response.error || 'Unable to get OmniFocus folder');
  }
  if (!response.folder || typeof response.folder !== 'object') {
    throw new Error('Invalid get_folder response: folder is missing');
  }

  return {
    success: true,
    folder: response.folder
  };
}

export async function getFolder(params: { id?: string; name?: string }): Promise<OmniFocusFolderDetail> {
  const result = await executeOmniFocusScript('@getFolder.js', {
    folderId: params.id || null,
    folderName: params.name || null
  });
  const data = parseGetFolderResult(result);
  return data.folder as OmniFocusFolderDetail;
}

export { parseGetFolderResult };
