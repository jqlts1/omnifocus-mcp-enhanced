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
