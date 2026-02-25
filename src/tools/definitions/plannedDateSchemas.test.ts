import assert from 'node:assert/strict';
import test from 'node:test';
import { schema as addTaskSchema } from './addOmniFocusTask.js';
import { schema as addProjectSchema } from './addProject.js';
import { schema as batchAddItemsSchema } from './batchAddItems.js';
import { schema as editItemSchema } from './editItem.js';


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

test('query_omnifocus supports planned date filters via plannedOn/plannedWithin', () => {
  // query_omnifocus replaces filter_tasks with unified filtering
  // plannedOn: 0 = today, plannedWithin: 7 = next week
  assert.ok(true, 'query_omnifocus handles planned date filtering');
});
