import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { FilterTasksOptions } from './filterTasks.js';

export interface CountTasksOptions extends FilterTasksOptions {}

export interface CountTasksResult {
  total: number;
  byStatus: Record<string, number>;
}

/**
 * Count tasks matching the given filters without returning the full task list.
 * Reuses the same OmniJS filter script and client-side filters as filter_tasks,
 * but returns only aggregate counts (fast "how many" queries, low token cost).
 */
export async function countTasks(options: CountTasksOptions = {}): Promise<CountTasksResult> {
  // countOnly runs the same OmniJS predicate as filter_tasks, but returns only
  // aggregates. This remains correct for databases larger than any list limit.
  const result = await executeOmniFocusScript('@filterTasks.js', {
    ...options,
    perspective: options.perspective || 'all',
    exactTagMatch: options.exactTagMatch ?? false,
    countOnly: true
  });

  if (result && typeof result === 'object') {
    const data = result as any;
    if (data.error) {
      throw new Error(data.error);
    }

    if (data.success !== true || typeof data.total !== 'number') {
      throw new Error('Invalid count_tasks response from OmniFocus');
    }

    return {
      total: data.total,
      byStatus: data.byStatus && typeof data.byStatus === 'object'
        ? data.byStatus
        : {}
    };
  }

  throw new Error('Unexpected result format from OmniFocus');
}
