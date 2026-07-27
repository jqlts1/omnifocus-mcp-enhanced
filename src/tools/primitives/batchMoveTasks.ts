import { executeOmniFocusScript } from '../../utils/scriptExecution.js';

export interface BatchTaskMove {
  taskId: string;
  projectId?: string;
  parentTaskId?: string;
  inbox?: boolean;
}

export interface BatchMoveTaskResult {
  taskId: string;
  taskName: string;
  destination: {
    kind: 'project' | 'parent' | 'inbox';
    id: string | null;
    name: string;
  };
  verified: boolean;
  changed: boolean;
}

export interface BatchMoveTasksResult {
  success: boolean;
  movedCount?: number;
  unchangedCount?: number;
  results?: BatchMoveTaskResult[];
  error?: string;
}

export async function batchMoveTasks(moves: BatchTaskMove[]): Promise<BatchMoveTasksResult> {
  const result = await executeOmniFocusScript('@batchMoveTasks.js', { moves });

  if (!result || typeof result !== 'object') {
    return { success: false, error: 'Unexpected result from OmniFocus' };
  }

  return result as BatchMoveTasksResult;
}
