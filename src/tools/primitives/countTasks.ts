import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { FilterTasksOptions, applyClientSideFilters } from './filterTasks.js';

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
  const {
    perspective = 'all',
    exactTagMatch = false,
    sortBy = 'name',
    sortOrder = 'asc'
  } = options;

  // Fetch a large set so client-side filters (tags/defer/planned) have full data.
  const result = await executeOmniFocusScript('@filterTasks.js', {
    ...options,
    perspective,
    exactTagMatch,
    limit: 100000,
    sortBy,
    sortOrder
  });

  if (result && typeof result === 'object') {
    const data = result as any;
    if (data.error) {
      throw new Error(data.error);
    }

    const tasks: any[] = Array.isArray(data.tasks) ? data.tasks : [];
    const filtered = applyClientSideFilters(tasks, options);

    const byStatus: Record<string, number> = {};
    for (const task of filtered) {
      const status = (task && task.taskStatus) ? String(task.taskStatus) : 'Unknown';
      byStatus[status] = (byStatus[status] || 0) + 1;
    }

    return { total: filtered.length, byStatus };
  }

  throw new Error('Unexpected result format from OmniFocus');
}
