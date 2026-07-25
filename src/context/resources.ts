import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { fetchTasks, fetchProjects, slimTask } from './omnifocusData.js';

function jsonResource(uri: string, payload: unknown) {
  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(payload, null, 2)
      }
    ]
  };
}

export function registerResources(server: McpServer): void {
  // 1. Inbox snapshot
  server.resource(
    'inbox',
    'omnifocus://inbox',
    {
      description: 'Current OmniFocus inbox tasks (uncompleted, unprocessed items).',
      mimeType: 'application/json'
    },
    async () => {
      const tasks = await fetchTasks({ perspective: 'inbox' }, 200);
      return jsonResource('omnifocus://inbox', {
        snapshotAt: new Date().toISOString(),
        count: tasks.length,
        tasks: tasks.map(slimTask)
      });
    }
  );

  // 2. Today snapshot (overdue + due today + flagged)
  server.resource(
    'today',
    'omnifocus://today',
    {
      description: "Today's OmniFocus focus: overdue tasks, tasks due today, and flagged tasks.",
      mimeType: 'application/json'
    },
    async () => {
      const [overdue, dueToday, flagged] = await Promise.all([
        fetchTasks({ overdue: true, taskStatus: ['Overdue'] }, 100),
        fetchTasks({ dueToday: true, taskStatus: ['Available', 'Next', 'DueSoon', 'Overdue'] }, 100),
        fetchTasks({ flagged: true, taskStatus: ['Available', 'Next', 'DueSoon', 'Overdue', 'Blocked'] }, 100)
      ]);

      return jsonResource('omnifocus://today', {
        snapshotAt: new Date().toISOString(),
        overdue: { count: overdue.length, tasks: overdue.map(slimTask) },
        dueToday: { count: dueToday.length, tasks: dueToday.map(slimTask) },
        flagged: { count: flagged.length, tasks: flagged.map(slimTask) }
      });
    }
  );

  // 3. Active projects snapshot
  server.resource(
    'projects',
    'omnifocus://projects',
    {
      description: 'All active OmniFocus projects with task counts and stalled-project detection.',
      mimeType: 'application/json'
    },
    async () => {
      const projects = await fetchProjects('active', 500);
      const stalled = projects.filter(project => project.isStalled);

      return jsonResource('omnifocus://projects', {
        snapshotAt: new Date().toISOString(),
        count: projects.length,
        stalledCount: stalled.length,
        projects
      });
    }
  );
}
