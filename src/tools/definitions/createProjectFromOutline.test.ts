import assert from 'node:assert/strict';
import test from 'node:test';
import { schema } from './createProjectFromOutline.js';

function nestedTask(depth: number): Record<string, unknown> {
  return depth === 1
    ? { name: `Level ${depth}` }
    : { name: `Level ${depth}`, children: [nestedTask(depth - 1)] };
}

test('create_project_from_outline accepts a strict nested core-field outline', () => {
  const parsed = schema.parse({
    project: {
      name: 'Launch',
      folderId: 'folder-1',
      tagIds: ['tag-1'],
      dueDate: '2026-08-30T18:00:00+08:00',
      sequential: true,
      tasks: [
        {
          name: 'Plan',
          note: 'Clarify scope',
          estimatedMinutes: 60,
          children: [{ name: 'Review', plannedDate: '2026-08-01' }],
        },
      ],
    },
  });

  assert.equal(parsed.project.tasks?.[0].children?.[0].name, 'Review');
});

test('create_project_from_outline rejects empty names and unknown fields', () => {
  assert.throws(() => schema.parse({ project: { name: '   ' } }));
  assert.throws(() =>
    schema.parse({ project: { name: 'Project', unsupported: true } }),
  );
  assert.throws(() =>
    schema.parse({
      project: { name: 'Project', tasks: [{ name: 'Task', status: 'done' }] },
    }),
  );
});

test('create_project_from_outline rejects invalid dates and estimates', () => {
  assert.throws(() =>
    schema.parse({ project: { name: 'Project', dueDate: 'not-a-date' } }),
  );
  assert.throws(() =>
    schema.parse({ project: { name: 'Project', dueDate: '08/30/2026' } }),
  );
  assert.throws(() =>
    schema.parse({
      project: {
        name: 'Project',
        tasks: [{ name: 'Task', estimatedMinutes: -1 }],
      },
    }),
  );
});

test('create_project_from_outline accepts 200 tasks and rejects 201', () => {
  const tasks = Array.from({ length: 200 }, (_, index) => ({
    name: `Task ${index}`,
  }));
  assert.equal(
    schema.parse({ project: { name: 'Project', tasks } }).project.tasks?.length,
    200,
  );
  assert.throws(() =>
    schema.parse({
      project: { name: 'Project', tasks: [...tasks, { name: 'Task 200' }] },
    }),
  );
});

test('create_project_from_outline accepts eight task levels and rejects nine', () => {
  schema.parse({ project: { name: 'Project', tasks: [nestedTask(8)] } });
  assert.throws(() =>
    schema.parse({ project: { name: 'Project', tasks: [nestedTask(9)] } }),
  );
});

test('create_project_from_outline accepts repetition on tasks only', () => {
  const parsed = schema.parse({
    project: {
      name: 'Admin',
      tasks: [
        {
          name: 'Weekly checklist',
          repetition: {
            ruleString: 'FREQ=WEEKLY;BYDAY=FR',
            scheduleType: 'FromCompletion',
            anchorDateKey: 'DueDate',
            catchUpAutomatically: true,
          },
        },
      ],
    },
  });

  assert.equal(
    parsed.project.tasks?.[0].repetition?.ruleString,
    'FREQ=WEEKLY;BYDAY=FR',
  );
  assert.throws(() =>
    schema.parse({
      project: { name: 'Admin', repetition: { ruleString: 'FREQ=WEEKLY' } },
    }),
  );
  assert.throws(() =>
    schema.parse({
      project: {
        name: 'Admin',
        tasks: [{ name: 'Task', repetition: { ruleString: '' } }],
      },
    }),
  );
});
