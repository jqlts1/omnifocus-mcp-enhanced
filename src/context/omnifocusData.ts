import { executeOmniFocusScript } from '../utils/scriptExecution.js';
import { FilterTasksOptions, applyClientSideFilters } from '../tools/primitives/filterTasks.js';

export interface RawTask {
  id: string;
  name: string;
  note?: string;
  taskStatus?: string;
  flagged?: boolean;
  dueDate?: string | null;
  deferDate?: string | null;
  plannedDate?: string | null;
  completedDate?: string | null;
  estimatedMinutes?: number | null;
  projectId?: string | null;
  projectName?: string | null;
  inInbox?: boolean;
  tags?: { id: string; name: string }[];
}

/**
 * Fetch raw task data using the shared OmniJS filter script, applying the
 * same client-side filters as filter_tasks. Returns structured objects
 * (not formatted markdown) so prompts and resources can serialize them.
 */
export async function fetchTasks(options: FilterTasksOptions = {}, limit = 1000): Promise<RawTask[]> {
  const result = await executeOmniFocusScript('@filterTasks.js', {
    ...options,
    perspective: options.perspective || 'all',
    exactTagMatch: options.exactTagMatch ?? false,
    limit: Math.max(limit * 5, 2000),
    sortBy: options.sortBy || 'name',
    sortOrder: options.sortOrder || 'asc'
  });

  if (!result || typeof result !== 'object') {
    return [];
  }

  const data = result as any;
  if (data.error) {
    throw new Error(data.error);
  }

  const tasks: RawTask[] = Array.isArray(data.tasks) ? data.tasks : [];
  return applyClientSideFilters(tasks, options).slice(0, limit);
}

/**
 * Compact a task down to the fields useful for planning prompts.
 */
export function slimTask(task: RawTask): Record<string, unknown> {
  return {
    id: task.id,
    name: task.name,
    note: task.note || '',
    status: task.taskStatus || null,
    flagged: !!task.flagged,
    dueDate: task.dueDate || null,
    deferDate: task.deferDate || null,
    plannedDate: task.plannedDate || null,
    estimatedMinutes: task.estimatedMinutes ?? null,
    projectName: task.projectName || null,
    inInbox: !!task.inInbox,
    tags: (task.tags || []).map(tag => tag.name)
  };
}

export interface RawProject {
  id: string;
  name: string;
  status: string;
  folderName: string | null;
  note: string;
  dueDate: string | null;
  deferDate: string | null;
  taskCount: number;
  remainingTaskCount: number;
  availableTaskCount: number;
  isStalled: boolean;
  sequential: boolean;
}

/**
 * Fetch projects with task counts and stalled detection.
 * status: 'active' | 'onHold' | 'done' | 'dropped' | 'all'
 */
export async function fetchProjects(status = 'active', limit = 500): Promise<RawProject[]> {
  const result = await executeOmniFocusScript('@listProjects.js', { status, limit });

  const data = typeof result === 'string' ? JSON.parse(result) : result;
  if (!data || typeof data !== 'object') {
    return [];
  }
  if (data.success !== true) {
    throw new Error(data.error || 'Unable to list OmniFocus projects');
  }

  return Array.isArray(data.projects) ? data.projects : [];
}
