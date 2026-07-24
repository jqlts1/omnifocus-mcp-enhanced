import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeOmnifocusDumpData } from './dumpDatabase.js';

test('normalizeOmnifocusDumpData preserves task and project added dates', () => {
  const taskAddedDate = '2026-05-20T10:30:00.000Z';
  const projectAddedDate = '2026-05-01T09:00:00.000Z';

  const database = normalizeOmnifocusDumpData({
    exportDate: '2026-05-28T00:00:00.000Z',
    tasks: [
      {
        id: 'task-1',
        name: 'Review quarterly goals',
        addedDate: taskAddedDate,
        note: '',
        taskStatus: 'Available',
        flagged: false,
        dueDate: null,
        deferDate: null,
        plannedDate: null,
        effectiveDueDate: null,
        effectiveDeferDate: null,
        effectivePlannedDate: null,
        estimatedMinutes: null,
        completedByChildren: false,
        sequential: false,
        tags: ['tag-1'],
        projectID: 'project-1',
        parentTaskID: null,
        children: [],
        inInbox: false
      }
    ],
    projects: {
      'project-1': {
        id: 'project-1',
        name: 'Quarterly planning',
        addedDate: projectAddedDate,
        status: 'Active',
        folderID: null,
        sequential: false,
        effectiveDueDate: null,
        effectiveDeferDate: null,
        effectivePlannedDate: null,
        dueDate: null,
        deferDate: null,
        plannedDate: null,
        completedByChildren: false,
        containsSingletonActions: false,
        note: '',
        tasks: ['task-1']
      }
    },
    folders: {},
    tags: {
      'tag-1': {
        id: 'tag-1',
        name: 'Planning',
        parentTagID: null,
        active: true,
        allowsNextAction: true,
        tasks: ['task-1']
      }
    }
  });

  assert.equal(database.tasks[0].addedDate, taskAddedDate);
  assert.equal(database.projects['project-1'].addedDate, projectAddedDate);
});

test('normalizeOmnifocusDumpData does not validate added date format', () => {
  const taskAddedDate = 'not-an-iso-date';
  const projectAddedDate = 'also-not-an-iso-date';

  const database = normalizeOmnifocusDumpData({
    exportDate: '2026-05-28T00:00:00.000Z',
    tasks: [
      {
        id: 'task-1',
        name: 'Review quarterly goals',
        addedDate: taskAddedDate,
        note: '',
        taskStatus: 'Available',
        flagged: false,
        dueDate: null,
        deferDate: null,
        plannedDate: null,
        effectiveDueDate: null,
        effectiveDeferDate: null,
        effectivePlannedDate: null,
        estimatedMinutes: null,
        completedByChildren: false,
        sequential: false,
        tags: [],
        projectID: 'project-1',
        parentTaskID: null,
        children: [],
        inInbox: false
      }
    ],
    projects: {
      'project-1': {
        id: 'project-1',
        name: 'Quarterly planning',
        addedDate: projectAddedDate,
        status: 'Active',
        folderID: null,
        sequential: false,
        effectiveDueDate: null,
        effectiveDeferDate: null,
        effectivePlannedDate: null,
        dueDate: null,
        deferDate: null,
        plannedDate: null,
        completedByChildren: false,
        containsSingletonActions: false,
        note: '',
        tasks: ['task-1']
      }
    },
    folders: {},
    tags: {}
  });

  assert.equal(database.tasks[0].addedDate, taskAddedDate);
  assert.equal(database.projects['project-1'].addedDate, projectAddedDate);
});
