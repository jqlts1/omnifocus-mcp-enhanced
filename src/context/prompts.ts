import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { fetchTasks, fetchProjects, slimTask } from './omnifocusData.js';

function userMessage(text: string) {
  return {
    messages: [
      {
        role: 'user' as const,
        content: { type: 'text' as const, text }
      }
    ]
  };
}

const ENGAGEMENT_PROTOCOL = `engagement protocol:
- ground every recommendation in the omnifocus data provided below.
- keep clarification questions minimal; only ask when genuinely blocked.
- after presenting the plan, ask whether to apply the changes in omnifocus now.
- if the user approves, execute the tool calls and report the created/updated ids.
- always ask for explicit confirmation before destructive operations
  (remove_item, batch_remove_items, remove_folder, remove_tag).`;

export function registerPrompts(server: McpServer): void {
  // 1. Daily review
  server.prompt(
    'daily_review',
    'daily planning review with overdue, due-soon, and flagged tasks.',
    async () => {
      const [overdue, dueSoon, flagged] = await Promise.all([
        fetchTasks({ overdue: true, taskStatus: ['Overdue'] }, 50),
        fetchTasks({ dueThisWeek: true, taskStatus: ['Available', 'Next', 'DueSoon'] }, 50),
        fetchTasks({ flagged: true, taskStatus: ['Available', 'Next', 'DueSoon', 'Overdue', 'Blocked'] }, 50)
      ]);

      const text = `run a focused daily review using the omnifocus data below.

1) identify the highest-risk overdue items.
2) review due-soon tasks and sequence today's execution.
3) evaluate flagged work and confirm whether it is genuinely urgent.
4) produce exactly three top priorities for today, each with a short rationale.
5) call out anything that should be deferred, delegated, or dropped.

${ENGAGEMENT_PROTOCOL}

overdue_tasks_json:
${JSON.stringify(overdue.map(slimTask))}

due_soon_tasks_json:
${JSON.stringify(dueSoon.map(slimTask))}

flagged_tasks_json:
${JSON.stringify(flagged.map(slimTask))}
`;

      return userMessage(text);
    }
  );

  // 2. Weekly review
  server.prompt(
    'weekly_review',
    'gtd-style weekly review with active projects and next-action coverage.',
    async () => {
      const [projects, availableTasks] = await Promise.all([
        fetchProjects('active', 500),
        fetchTasks({ taskStatus: ['Available', 'Next'] }, 1000)
      ]);

      const stalled = projects.filter(project => project.isStalled);

      const text = `run a gtd-style weekly review using the omnifocus data below.

1) review all active projects and classify each as: on track, at risk, or stalled.
2) a project is stalled when work remains but no task is available or next.
   the data already flags these with "isStalled": true.
3) propose one concrete next action for every stalled project.
4) highlight projects that need due/defer date changes or scope adjustments.
5) produce a concise weekly plan:
   - top 5 project priorities
   - key risks and blockers
   - cleanup actions (drop, defer, delegate, or someday/maybe)

${ENGAGEMENT_PROTOCOL}

active_projects_json:
${JSON.stringify(projects)}

stalled_projects_json:
${JSON.stringify(stalled)}

available_tasks_json:
${JSON.stringify(availableTasks.map(slimTask))}
`;

      return userMessage(text);
    }
  );

  // 3. Inbox processing
  server.prompt(
    'inbox_processing',
    'gtd inbox processing session with one-by-one clarification decisions.',
    async () => {
      const inboxTasks = await fetchTasks({ perspective: 'inbox' }, 200);

      const text = `run a gtd inbox processing session using the inbox data below.

for each inbox item, prepare a safe organization proposal in this order:
1) clarify the desired outcome and the very next action.
2) decide whether to delete, defer, delegate, or keep it.
3) if kept, assign the best target project (or keep in inbox if truly unassigned).
4) propose relevant tags and whether it should be flagged.
5) suggest due/defer dates only when there is a real deadline or start date.
6) suggest estimated minutes when the task is actionable.

respond with:
- a prioritized processing queue
- concrete update recommendations per item
- a compact move proposal grouped by destination, showing task and destination ids
- items that should remain in inbox or need clarification

execution rules:
- do not call batch_move_tasks until the user explicitly confirms the displayed proposal.
- after confirmation, call batch_move_tasks once with stable ids. it automatically
  validates the complete batch, executes atomically, and verifies every destination.
- do not combine moving with deletion, tag changes, date changes, or renaming in
  the same batch. handle those separately after the move result.
- after execution, report verified moves and re-read inbox to show remaining items.

${ENGAGEMENT_PROTOCOL}

inbox_items_json:
${JSON.stringify(inboxTasks.map(slimTask))}
`;

      return userMessage(text);
    }
  );

  // 4. Project planning
  server.prompt(
    'project_planning',
    'turn a project into clear, sequenced, executable next actions.',
    { project: z.string().describe('the name of the project to plan') },
    async ({ project }: { project: string }) => {
      const projectName = (project || '').trim();
      if (projectName === '') {
        throw new Error('project must not be empty.');
      }

      const allProjects = await fetchProjects('all', 1000);
      const needle = projectName.toLowerCase();
      const match =
        allProjects.find(candidate => candidate.name.toLowerCase() === needle) ||
        allProjects.find(candidate => candidate.name.toLowerCase().includes(needle)) ||
        null;

      const projectTasks = match
        ? await fetchTasks({ projectFilter: match.name, taskStatus: ['Available', 'Next', 'Blocked', 'DueSoon', 'Overdue'] }, 500)
        : [];

      const projectDetails = match
        ? match
        : { name: projectName, status: 'not_found', lookupNote: 'no matching project in omnifocus' };

      const text = `plan this project into clear executable work.

project name:
${projectName}

planning goals:
1) summarize the project outcome in one concise sentence.
2) evaluate current task coverage and identify missing steps.
3) convert vague items into concrete next actions (verb-first, observable).
4) sequence the work logically (dependencies first, then parallelizable actions).
5) estimate effort in minutes for each next action and flag high-risk items.
6) recommend what to do now, next, and later, plus what to defer or drop.

output format:
- project summary
- work breakdown table: action | estimate | priority | dependency | suggested tags | due/defer | rationale
- the first three actions to execute immediately
- risk and blocker list with mitigation ideas

notes:
- if the project status is "not_found", plan from user intent and then ask
  whether to create the project in omnifocus.

${ENGAGEMENT_PROTOCOL}

project_details_json:
${JSON.stringify(projectDetails)}

project_tasks_json:
${JSON.stringify(projectTasks.map(slimTask))}
`;

      return userMessage(text);
    }
  );
}
