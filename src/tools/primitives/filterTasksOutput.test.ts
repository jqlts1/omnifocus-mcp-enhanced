import assert from 'node:assert/strict';
import test from 'node:test';
import { formatCompactTaskTreeNode } from './filterTasks.js';
import { readFile } from 'node:fs/promises';
import { formatTaskTreeNode, TaskTreeNode } from './taskTreeFormatter.js';

const task: TaskTreeNode = {
  id: 'task-1',
  name: 'Prepare launch',
  note: 'Sensitive planning note',
  taskStatus: 'Available',
  projectName: 'Launch',
  dueDate: '2026-07-27T10:00:00.000Z',
  deferDate: '2026-07-26T10:00:00.000Z',
  plannedDate: '2026-07-27T09:00:00.000Z',
  flagged: true,
  estimatedMinutes: 45,
  tags: [
    {
      id: 'tag-private',
      name: 'private-tag',
      path: 'contexts / private-tag',
      ancestorIds: ['tag-contexts'],
    },
  ],
  childrenCount: 1,
  children: [{
    id: 'child-1',
    name: 'Confirm copy',
    note: 'Child note',
    taskStatus: 'Next',
    projectName: 'Launch',
    childrenCount: 0,
    children: [],
  }],
};

test('compact task output keeps planning fields and omits notes and tags', () => {
  const output = formatCompactTaskTreeNode(task, false);

  assert.match(output, /ID: task-1/);
  assert.match(output, /status: Available/);
  assert.match(output, /project: Launch/);
  assert.match(output, /due:/);
  assert.match(output, /defer:/);
  assert.match(output, /planned:/);
  assert.match(output, /flagged/);
  assert.match(output, /estimate: 45m/);
  assert.match(output, /1 subtask/);
  assert.doesNotMatch(output, /Sensitive planning note/);
  assert.doesNotMatch(output, /private-tag/);
});

test('compact expanded descendants also omit notes and tags', () => {
  const output = formatCompactTaskTreeNode(task, true);
  assert.match(output, /Confirm copy/);
  assert.match(output, /ID: child-1/);
  assert.doesNotMatch(output, /Child note/);
});

test('detailed output remains available with notes and tags', () => {
  const output = formatTaskTreeNode(task, '', { showSubtasks: false });
  assert.match(output, /Sensitive planning note/);
  assert.match(output, /private-tag/);
  assert.match(output, /contexts \/ private-tag/);
});

test('default no-cursor output adds page metadata only when another page exists', async () => {
  const source = await readFile(new URL('./filterTasks.js', import.meta.url), 'utf8');
  assert.match(source, /if \(options\.cursor \|\| data\.hasMore\)/);
});
