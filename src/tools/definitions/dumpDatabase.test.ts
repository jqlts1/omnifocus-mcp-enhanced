import assert from 'node:assert/strict';
import test from 'node:test';
import * as dumpDatabaseModule from './dumpDatabase.js';

const formatCompactReport = (dumpDatabaseModule as any).formatCompactReport;

test('formatCompactReport includes root inbox tasks in dedicated INBOX section', () => {
  assert.equal(typeof formatCompactReport, 'function');

  const output = formatCompactReport(
    {
      exportDate: '2026-02-12T00:00:00.000Z',
      tasks: [
        {
          id: 'task-inbox-1',
          name: 'Pay electricity bill',
          projectId: null,
          parentId: null,
          childIds: [],
          completed: false,
          taskStatus: 'Available',
          flagged: false,
          dueDate: null,
          deferDate: null,
          plannedDate: null,
          estimatedMinutes: null,
          tagNames: []
        }
      ],
      projects: {},
      folders: {},
      tags: {}
    },
    {
      hideCompleted: true,
      hideRecurringDuplicates: true
    }
  );

  assert.match(output, /INBOX:/);
  assert.match(output, /Pay electricity bill/);
});

test('formatCompactReport respects hideCompleted for inbox tasks', () => {
  assert.equal(typeof formatCompactReport, 'function');

  const database = {
    exportDate: '2026-02-12T00:00:00.000Z',
    tasks: [
      {
        id: 'task-inbox-completed',
        name: 'Archive notes',
        projectId: null,
        parentId: null,
        childIds: [],
        completed: true,
        taskStatus: 'Completed',
        flagged: false,
        dueDate: null,
        deferDate: null,
        plannedDate: null,
        estimatedMinutes: null,
        tagNames: []
      }
    ],
    projects: {},
    folders: {},
    tags: {}
  };

  const hiddenOutput = formatCompactReport(database, {
    hideCompleted: true,
    hideRecurringDuplicates: true
  });

  assert.doesNotMatch(hiddenOutput, /Archive notes/);

  const visibleOutput = formatCompactReport(database, {
    hideCompleted: false,
    hideRecurringDuplicates: true
  });

  assert.match(visibleOutput, /Archive notes/);
});

test('formatCompactReport includes planned date marker for tasks', () => {
  assert.equal(typeof formatCompactReport, 'function');
  const plannedDate = '2026-02-20T12:00:00.000Z';
  const plannedLocal = new Date(plannedDate);
  const plannedMarker = `PLAN:${plannedLocal.getMonth() + 1}/${plannedLocal.getDate()}`;

  const output = formatCompactReport(
    {
      exportDate: '2026-02-12T00:00:00.000Z',
      tasks: [
        {
          id: 'task-plan-1',
          name: 'Prepare proposal',
          projectId: null,
          parentId: null,
          childIds: [],
          completed: false,
          taskStatus: 'Available',
          flagged: false,
          dueDate: null,
          deferDate: null,
          plannedDate,
          estimatedMinutes: null,
          tagNames: []
        }
      ],
      projects: {},
      folders: {},
      tags: {}
    },
    {
      hideCompleted: true,
      hideRecurringDuplicates: true
    }
  );

  assert.match(output, new RegExp(plannedMarker));
});

test('formatCompactReport includes added date markers for tasks and projects', () => {
  assert.equal(typeof formatCompactReport, 'function');
  const taskAddedDate = '2026-02-10T12:00:00.000Z';
  const projectAddedDate = '2026-02-01T12:00:00.000Z';
  const taskAddedLocal = new Date(taskAddedDate);
  const projectAddedLocal = new Date(projectAddedDate);
  const taskMarker = `ADD:${taskAddedLocal.getMonth() + 1}/${taskAddedLocal.getDate()}`;
  const projectMarker = `ADD:${projectAddedLocal.getMonth() + 1}/${projectAddedLocal.getDate()}`;

  const output = formatCompactReport(
    {
      exportDate: '2026-02-12T00:00:00.000Z',
      tasks: [
        {
          id: 'task-added-1',
          name: 'Review quarterly goals',
          projectId: 'project-added-1',
          parentId: null,
          childIds: [],
          completed: false,
          taskStatus: 'Available',
          flagged: false,
          addedDate: taskAddedDate,
          dueDate: null,
          deferDate: null,
          plannedDate: null,
          estimatedMinutes: null,
          tagNames: []
        }
      ],
      projects: {
        'project-added-1': {
          id: 'project-added-1',
          name: 'Quarterly planning',
          status: 'Active',
          folderID: null,
          flagged: false,
          addedDate: projectAddedDate
        }
      },
      folders: {},
      tags: {}
    },
    {
      hideCompleted: true,
      hideRecurringDuplicates: true
    }
  );

  assert.match(output, new RegExp(`P: Quarterly planning \\[${projectMarker}\\]`));
  assert.match(output, new RegExp(`Review quarterly goals \\[${taskMarker}\\]`));
});
