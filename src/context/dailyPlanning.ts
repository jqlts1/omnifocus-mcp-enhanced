import { countTasks, CountTasksResult } from '../tools/primitives/countTasks.js';
import { FilterTasksOptions } from '../tools/primitives/filterTasks.js';
import { fetchTasks, RawTask } from './omnifocusData.js';

export type DailyPlanningSource = 'overdue' | 'dueToday' | 'plannedToday' | 'flagged';

export interface DailyPlanningCandidate extends RawTask {
  sources: DailyPlanningSource[];
}

export interface DailyPlanningData {
  counts: Record<DailyPlanningSource, CountTasksResult>;
  candidates: DailyPlanningCandidate[];
  missingDetailSources: DailyPlanningSource[];
  truncatedDetailSources: DailyPlanningSource[];
  detailLimitPerSource: number;
}

interface DailyPlanningDependencies {
  count: (options: FilterTasksOptions) => Promise<CountTasksResult>;
  fetch: (options: FilterTasksOptions, limit: number) => Promise<RawTask[]>;
}

const sourceFilters: Record<DailyPlanningSource, FilterTasksOptions> = {
  overdue: { overdue: true, sortBy: 'dueDate', sortOrder: 'asc' },
  dueToday: { dueToday: true, sortBy: 'dueDate', sortOrder: 'asc' },
  plannedToday: { plannedToday: true, sortBy: 'plannedDate', sortOrder: 'asc' },
  flagged: {
    flagged: true,
    taskStatus: ['Available', 'Next', 'DueSoon', 'Overdue', 'Blocked'],
    sortBy: 'dueDate',
    sortOrder: 'asc',
  },
};

export async function collectDailyPlanningData(
  detailLimitPerSource = 30,
  dependencies: DailyPlanningDependencies = { count: countTasks, fetch: fetchTasks },
): Promise<DailyPlanningData> {
  const sources = Object.keys(sourceFilters) as DailyPlanningSource[];
  const countResults = await Promise.all(
    sources.map(async source => [source, await dependencies.count(sourceFilters[source])] as const),
  );
  const counts = Object.fromEntries(countResults) as Record<DailyPlanningSource, CountTasksResult>;

  const detailResults = await Promise.allSettled(
    sources.map(source => dependencies.fetch(sourceFilters[source], detailLimitPerSource)),
  );

  const candidatesById = new Map<string, DailyPlanningCandidate>();
  const missingDetailSources: DailyPlanningSource[] = [];
  const truncatedDetailSources: DailyPlanningSource[] = [];
  detailResults.forEach((result, index) => {
    const source = sources[index];
    if (result.status === 'rejected') {
      missingDetailSources.push(source);
      return;
    }

    if (counts[source].total > result.value.length) {
      truncatedDetailSources.push(source);
    }

    result.value.forEach(task => {
      const existing = candidatesById.get(task.id);
      if (existing) {
        if (!existing.sources.includes(source)) existing.sources.push(source);
      } else {
        candidatesById.set(task.id, { ...task, sources: [source] });
      }
    });
  });

  return {
    counts,
    candidates: Array.from(candidatesById.values()),
    missingDetailSources,
    truncatedDetailSources,
    detailLimitPerSource,
  };
}

export function compactDailyCandidate(task: DailyPlanningCandidate): Record<string, unknown> {
  return {
    id: task.id,
    name: task.name,
    status: task.taskStatus || null,
    projectName: task.projectName || (task.inInbox ? 'Inbox' : null),
    parentId: task.parentId || null,
    inInbox: !!task.inInbox,
    dueDate: task.dueDate || null,
    deferDate: task.deferDate || null,
    plannedDate: task.plannedDate || null,
    flagged: !!task.flagged,
    estimatedMinutes: task.estimatedMinutes ?? null,
    childrenCount: task.childrenCount || 0,
    sources: task.sources,
  };
}
