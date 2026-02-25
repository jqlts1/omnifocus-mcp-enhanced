import { executeOmniFocusScript } from '../../utils/scriptExecution.js';

export interface GetCompletedTasksInRangeOptions {
  daysBack?: number;
  limit?: number;
}

export async function getCompletedTasksInRange(options: GetCompletedTasksInRangeOptions = {}): Promise<any> {
  try {
    const { daysBack = 7, limit = 50 } = options;

    const result = await executeOmniFocusScript('@completedTasksInRange.js', { daysBack, limit });

    if (typeof result === 'string') {
      return JSON.parse(result);
    }

    if (result && typeof result === 'object') {
      if (result.error) {
        throw new Error(result.error);
      }
      return result;
    }

    throw new Error('Unexpected result format');
  } catch (error) {
    console.error("Error in getCompletedTasksInRange:", error);
    throw new Error(`Failed to get completed tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
