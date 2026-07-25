import { executeOmniFocusScript } from '../../utils/scriptExecution.js';

export interface DuplicateTaskParams {
  taskId?: string;
  taskName?: string;
  newName?: string;          // Optional name for the duplicated task
  includeSubtasks?: boolean; // Whether to keep subtasks in the copy (default: true)
}

interface DuplicateTaskScriptResult {
  success: boolean;
  newTaskId?: string;
  name?: string;
  childrenCount?: number;
  error?: string;
}

export async function duplicateTask(params: DuplicateTaskParams): Promise<{
  success: boolean,
  newTaskId?: string,
  name?: string,
  childrenCount?: number,
  error?: string
}> {
  try {
    if (!params.taskId && !params.taskName) {
      return { success: false, error: 'Either taskId or taskName must be provided' };
    }

    const result = await executeOmniFocusScript('@duplicateTask.js', {
      taskId: params.taskId || null,
      taskName: params.taskName || null,
      newName: params.newName || null,
      includeSubtasks: params.includeSubtasks !== undefined ? params.includeSubtasks : true
    }) as DuplicateTaskScriptResult;

    if (!result || result.success !== true) {
      return { success: false, error: (result && result.error) || 'Failed to duplicate task' };
    }

    return {
      success: true,
      newTaskId: result.newTaskId,
      name: result.name,
      childrenCount: result.childrenCount
    };
  } catch (error: any) {
    console.error('Error in duplicateTask:', error);
    return { success: false, error: error?.message || 'Unknown error in duplicateTask' };
  }
}
