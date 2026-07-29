import { executeOmniFocusScript } from '../../utils/scriptExecution.js';

export interface BatchCompleteTasksParams {
  items: Array<{
    taskId: string;
    action: 'complete' | 'incomplete';
    completionDate?: string;
  }>;
}

export type CompletionErrorCode =
  | 'INVALID_COMPLETION'
  | 'COMPLETION_FAILED_RESTORED'
  | 'COMPLETION_VERIFICATION_FAILED_RESTORED'
  | 'COMPLETION_RESTORE_UNCONFIRMED';

export interface BatchCompleteTasksResult {
  success: boolean;
  code?: CompletionErrorCode;
  error?: string;
  restored?: boolean;
  residualTaskIds?: string[];
  recovery?: string;
  items?: Array<{
    taskId: string;
    status: 'completed' | 'incompleted' | 'unchanged';
    completionDate?: string;
    generatedTaskId?: string;
    nextOccurrence?: string;
  }>;
}

function validateParams(
  params: BatchCompleteTasksParams,
): { valid: boolean; error?: string } {
  if (!params.items || params.items.length === 0) {
    return { valid: false, error: 'items array is required' };
  }

  if (params.items.length > 100) {
    return { valid: false, error: 'items array must not exceed 100 entries' };
  }

  const seen = new Set<string>();
  for (const item of params.items) {
    if (!item.taskId || typeof item.taskId !== 'string') {
      return { valid: false, error: 'every item must have a taskId' };
    }
    if (seen.has(item.taskId)) {
      return { valid: false, error: `duplicate taskId: ${item.taskId}` };
    }
    seen.add(item.taskId);

    if (item.action !== 'complete' && item.action !== 'incomplete') {
      return {
        valid: false,
        error: `invalid action for ${item.taskId}: ${item.action}`,
      };
    }

    if (item.completionDate !== undefined) {
      if (item.action !== 'complete') {
        return {
          valid: false,
          error: `completionDate only valid with action=complete for ${item.taskId}`,
        };
      }
      const date = new Date(item.completionDate);
      if (Number.isNaN(date.getTime())) {
        return {
          valid: false,
          error: `invalid completionDate for ${item.taskId}: ${item.completionDate}`,
        };
      }
    }
  }

  return { valid: true };
}

export async function batchCompleteTasks(
  params: BatchCompleteTasksParams,
): Promise<BatchCompleteTasksResult> {
  const validation = validateParams(params);
  if (!validation.valid) {
    return {
      success: false,
      code: 'INVALID_COMPLETION',
      error: validation.error,
    };
  }

  const result = await executeOmniFocusScript('@batchCompleteTasks.js', {
    items: params.items,
  });

  if (typeof result === 'string') {
    try {
      return JSON.parse(result) as BatchCompleteTasksResult;
    } catch {
      return { success: false, code: 'INVALID_COMPLETION', error: result };
    }
  }

  return result as BatchCompleteTasksResult;
}
