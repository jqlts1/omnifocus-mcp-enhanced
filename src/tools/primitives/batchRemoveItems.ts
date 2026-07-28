import { executeOmniFocusScript } from '../../utils/scriptExecution.js';

export interface BatchRemoveItemsParams {
  id: string;
  itemType: 'task' | 'project';
}

export interface BatchRemoveItemResult extends BatchRemoveItemsParams {
  name: string;
  cascadeCount: number;
  verified: boolean;
}

export interface BatchRemoveItemsResult {
  success: boolean;
  removedCount?: number;
  results?: BatchRemoveItemResult[];
  error?: string;
}

export async function batchRemoveItems(
  items: BatchRemoveItemsParams[],
): Promise<BatchRemoveItemsResult> {
  const result = await executeOmniFocusScript('@batchRemoveItems.js', {
    items,
  });

  if (!result || typeof result !== 'object') {
    return { success: false, error: 'Unexpected result from OmniFocus' };
  }

  return result as BatchRemoveItemsResult;
}
