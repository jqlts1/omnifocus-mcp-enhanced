import { editItem, EditItemParams } from './editItem.js';

export interface MoveTaskParams {
  id?: string;
  name?: string;
  targetProjectId?: string;
  targetProjectName?: string;
  targetParentTaskId?: string;
  targetParentTaskName?: string;
  targetInbox?: boolean;
}

export function validateMoveTaskParams(params: MoveTaskParams): { valid: boolean; error?: string } {
  if (!params.id && !params.name) {
    return {
      valid: false,
      error: 'Either id or name must be provided to move a task.'
    };
  }

  if (params.targetProjectId && params.targetProjectName) {
    return {
      valid: false,
      error: 'Cannot specify both targetProjectId and targetProjectName. Please use only one.'
    };
  }

  if (params.targetParentTaskId && params.targetParentTaskName) {
    return {
      valid: false,
      error: 'Cannot specify both targetParentTaskId and targetParentTaskName. Please use only one.'
    };
  }

  const destinationTypeCount = [
    params.targetProjectId || params.targetProjectName ? 1 : 0,
    params.targetParentTaskId || params.targetParentTaskName ? 1 : 0,
    params.targetInbox === true ? 1 : 0
  ].reduce((sum, val) => sum + val, 0);

  if (destinationTypeCount !== 1) {
    return {
      valid: false,
      error: 'Exactly one destination must be provided: project, parent task, or inbox.'
    };
  }

  return { valid: true };
}

export function buildMoveTaskEditParams(params: MoveTaskParams): EditItemParams {
  return {
    id: params.id,
    name: params.name,
    itemType: 'task',
    newProjectId: params.targetProjectId,
    newProjectName: params.targetProjectName,
    newParentTaskId: params.targetParentTaskId,
    newParentTaskName: params.targetParentTaskName,
    moveToInbox: params.targetInbox === true
  };
}

export async function moveTask(params: MoveTaskParams): Promise<{
  success: boolean;
  id?: string;
  name?: string;
  changedProperties?: string;
  error?: string;
}> {
  const validation = validateMoveTaskParams(params);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error
    };
  }

  return editItem(buildMoveTaskEditParams(params));
}
