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
    plannedDate: '2026-02-14T09:00:00Z'
  }) as any;

  assert.equal(parsed.plannedDate, '2026-02-14T09:00:00Z');
});

test('add_project schema preserves plannedDate', () => {
  const parsed = addProjectSchema.parse({
    name: 'Plan project',
    plannedDate: '2026-02-14'
  }) as any;

  assert.equal(parsed.plannedDate, '2026-02-14');
});

test('batch_add_items schema preserves plannedDate for task and project', () => {
  const parsed = batchAddItemsSchema.parse({
    items: [
      {
        type: 'task',
        name: 'Task with plan',
        plannedDate: '2026-02-14'
      },
      {
        type: 'project',
        name: 'Project with plan',
        plannedDate: '2026-02-15'
      }
    ]
  }) as any;

  assert.equal(parsed.items[0].plannedDate, '2026-02-14');
  assert.equal(parsed.items[1].plannedDate, '2026-02-15');
});

test('edit_item schema preserves newPlannedDate', () => {
  const parsed = editItemSchema.parse({
    itemType: 'task',
    id: 'abc',
    newPlannedDate: '2026-02-14'
  }) as any;

  assert.equal(parsed.newPlannedDate, '2026-02-14');
});

test('filter_tasks schema supports planned date filters and sorting', () => {
  const parsed = filterTasksSchema.parse({
    plannedToday: true,
    plannedAfter: '2026-02-10',
    plannedBefore: '2026-02-20',
    sortBy: 'plannedDate'
  }) as any;

  assert.equal(parsed.plannedToday, true);
  assert.equal(parsed.plannedAfter, '2026-02-10');
  assert.equal(parsed.plannedBefore, '2026-02-20');
  assert.equal(parsed.sortBy, 'plannedDate');
});
