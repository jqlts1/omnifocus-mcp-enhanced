import assert from 'node:assert/strict';
import test from 'node:test';
import { schema as addTaskSchema } from './addOmniFocusTask.js';
import { schema as addProjectSchema } from './addProject.js';
import { schema as batchAddItemsSchema } from './batchAddItems.js';
import { schema as editItemSchema } from './editItem.js';
import { schema as filterTasksSchema } from './filterTasks.js';

test('add_omnifocus_task schema preserves plannedDate', () => {
  const parsed = addTaskSchema.parse({
    name: 'Plan task',
    plannedDate: '2026-02-14T09:00:00Z',
  }) as any;

  assert.equal(parsed.plannedDate, '2026-02-14T09:00:00Z');
});

test('add_project schema preserves plannedDate', () => {
  const parsed = addProjectSchema.parse({
    name: 'Plan project',
    plannedDate: '2026-02-14',
  }) as any;

  assert.equal(parsed.plannedDate, '2026-02-14');
});

test('batch_add_items schema preserves plannedDate for task and project', () => {
  const parsed = batchAddItemsSchema.parse({
    items: [
      {
        type: 'task',
        name: 'Task with plan',
        plannedDate: '2026-02-14',
      },
      {
        type: 'project',
        name: 'Project with plan',
        plannedDate: '2026-02-15',
      },
    ],
  }) as any;

  assert.equal(parsed.items[0].plannedDate, '2026-02-14');
  assert.equal(parsed.items[1].plannedDate, '2026-02-15');
});

test('batch_add_items schema documents subtask project inheritance', () => {
  const itemSchema = (batchAddItemsSchema.shape.items as any)._def.type;
  const projectNameDescription = itemSchema.shape.projectName.description;
  const parentTaskNameDescription = itemSchema.shape.parentTaskName.description;

  assert.match(
    projectNameDescription,
    /omit this when parentTaskId or parentTaskName is set/i,
  );
  assert.match(
    parentTaskNameDescription,
    /subtasks inherit project from their parent/i,
  );
});

test('edit_item schema preserves newPlannedDate', () => {
  const parsed = editItemSchema.parse({
    itemType: 'task',
    id: 'abc',
    newPlannedDate: '2026-02-14',
  }) as any;

  assert.equal(parsed.newPlannedDate, '2026-02-14');
});

test('edit_item schema supports task move destination fields', () => {
  const parsed = editItemSchema.parse({
    itemType: 'task',
    id: 'abc',
    newProjectId: 'project-1',
    moveToInbox: false,
  }) as any;

  assert.equal(parsed.newProjectId, 'project-1');
  assert.equal(parsed.moveToInbox, false);
});

test('filter_tasks schema supports planned date filters and sorting', () => {
  const parsed = filterTasksSchema.parse({
    plannedToday: true,
    plannedAfter: '2026-02-10',
    plannedBefore: '2026-02-20',
    sortBy: 'plannedDate',
  }) as any;

  assert.equal(parsed.plannedToday, true);
  assert.equal(parsed.plannedAfter, '2026-02-10');
  assert.equal(parsed.plannedBefore, '2026-02-20');
  assert.equal(parsed.sortBy, 'plannedDate');
});

test('filter_tasks schema supports only detailed or compact output', () => {
  assert.equal(
    filterTasksSchema.parse({ outputMode: 'compact' }).outputMode,
    'compact',
  );
  assert.equal(
    filterTasksSchema.parse({ outputMode: 'detailed' }).outputMode,
    'detailed',
  );
  assert.throws(() => filterTasksSchema.parse({ outputMode: 'custom' }));
});

test('filter_tasks schema accepts a bounded opaque cursor', () => {
  assert.equal(filterTasksSchema.parse({ cursor: 'abc' }).cursor, 'abc');
  assert.throws(() => filterTasksSchema.parse({ cursor: 'a'.repeat(2049) }));
});

test('add_omnifocus_task schema preserves exclusiveTags', () => {
  const parsed = addTaskSchema.parse({
    name: 'Task with exclusive tags',
    tags: ['High', 'Work'],
    exclusiveTags: false,
  }) as any;

  assert.equal(parsed.exclusiveTags, false);
});

test('add_project schema preserves exclusiveTags', () => {
  const parsed = addProjectSchema.parse({
    name: 'Project with exclusive tags',
    tags: ['High'],
    exclusiveTags: true,
  }) as any;

  assert.equal(parsed.exclusiveTags, true);
});

test('edit_item schema preserves exclusiveTags', () => {
  const parsed = editItemSchema.parse({
    itemType: 'task',
    id: 'abc',
    addTags: ['High'],
    exclusiveTags: true,
  }) as any;

  assert.equal(parsed.exclusiveTags, true);
});

test('add_omnifocus_task schema accepts a strict repetition object', () => {
  const parsed = addTaskSchema.parse({
    name: 'Weekly admin checklist',
    repetition: {
      ruleString: 'FREQ=WEEKLY;BYDAY=FR',
      scheduleType: 'FromCompletion',
      anchorDateKey: 'PlannedDate',
      catchUpAutomatically: true,
    },
  }) as any;

  assert.equal(parsed.repetition.ruleString, 'FREQ=WEEKLY;BYDAY=FR');
  assert.equal(parsed.repetition.anchorDateKey, 'PlannedDate');
});

test('add_omnifocus_task schema rejects invalid or extra repetition fields', () => {
  assert.throws(() =>
    addTaskSchema.parse({ name: 'Task', repetition: { ruleString: '' } }),
  );
  assert.throws(() =>
    addTaskSchema.parse({
      name: 'Task',
      repetition: { ruleString: 'FREQ=WEEKLY', scheduleType: 'Whenever' },
    }),
  );
  assert.throws(() =>
    addTaskSchema.parse({
      name: 'Task',
      repetition: { ruleString: 'FREQ=WEEKLY', method: 'DueDate' },
    }),
  );
});
