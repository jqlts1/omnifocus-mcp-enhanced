import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import {
  countTasks,
  CountTasksResult,
} from '../tools/primitives/countTasks.js';
import { FilterTasksOptions } from '../tools/primitives/filterTasks.js';
import {
  fetchTasks,
  fetchProjects,
  slimTask,
  RawTask,
} from './omnifocusData.js';

function jsonResource(uri: string, payload: unknown) {
  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

export interface BoundedTaskSnapshot {
  totalCount: number;
  returnedCount: number;
  truncated: boolean;
  tasks: Record<string, unknown>[];
}

type CountTasks = (options: FilterTasksOptions) => Promise<CountTasksResult>;
type FetchTasks = (
  options: FilterTasksOptions,
  limit: number,
) => Promise<RawTask[]>;

export async function buildBoundedSnapshot(
  options: FilterTasksOptions,
  limit: number,
  count: CountTasks = countTasks,
  fetch: FetchTasks = fetchTasks,
): Promise<BoundedTaskSnapshot> {
  const [countResult, tasks] = await Promise.all([
    count(options),
    fetch(options, limit),
  ]);

  return {
    totalCount: countResult.total,
    returnedCount: tasks.length,
    truncated: countResult.total > tasks.length,
    tasks: tasks.map(slimTask),
  };
}

export function registerResources(server: McpServer): void {
  server.registerResource(
    'inbox',
    'omnifocus://inbox',
    {
      description:
        'Current OmniFocus inbox tasks (uncompleted, unprocessed items).',
      mimeType: 'application/json',
    },
    async () => {
      const snapshot = await buildBoundedSnapshot(
        { perspective: 'inbox' },
        200,
      );
      return jsonResource('omnifocus://inbox', {
        snapshotAt: new Date().toISOString(),
        ...snapshot,
      });
    },
  );

  server.registerResource(
    'today',
    'omnifocus://today',
    {
      description:
        "Today's OmniFocus focus: overdue tasks, tasks due today, and flagged tasks.",
      mimeType: 'application/json',
    },
    async () => {
      const [overdue, dueToday, flagged] = await Promise.all([
        buildBoundedSnapshot({ overdue: true, taskStatus: ['Overdue'] }, 100),
        buildBoundedSnapshot(
          {
            dueToday: true,
            taskStatus: ['Available', 'Next', 'DueSoon', 'Overdue'],
          },
          100,
        ),
        buildBoundedSnapshot(
          {
            flagged: true,
            taskStatus: ['Available', 'Next', 'DueSoon', 'Overdue', 'Blocked'],
          },
          100,
        ),
      ]);

      return jsonResource('omnifocus://today', {
        snapshotAt: new Date().toISOString(),
        overdue,
        dueToday,
        flagged,
      });
    },
  );

  server.registerResource(
    'projects',
    'omnifocus://projects',
    {
      description:
        'Active OmniFocus projects with task counts and stalled-project detection.',
      mimeType: 'application/json',
    },
    async () => {
      const projects = await fetchProjects('active', 501);
      const truncated = projects.length > 500;
      const returnedProjects = projects.slice(0, 500);
      const stalled = returnedProjects.filter((project) => project.isStalled);

      return jsonResource('omnifocus://projects', {
        snapshotAt: new Date().toISOString(),
        returnedCount: returnedProjects.length,
        truncated,
        stalledCount: stalled.length,
        projects: returnedProjects,
      });
    },
  );
}
