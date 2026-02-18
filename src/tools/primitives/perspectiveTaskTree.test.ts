import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPerspectiveTaskTree } from './perspectiveTaskTree.js';

test('buildPerspectiveTaskTree groups by project and preserves nested children', () => {
  const tasks = [
    { id: 'p1', name: 'Parent', project: 'Alpha', parent: null, tags: ['focus'], note: 'parent note', completed: false },
    { id: 'c1', name: 'Child', project: 'Alpha', parent: 'p1', tags: ['client'], note: 'child note', completed: false },
    { id: 'g1', name: 'Grandchild', project: 'Alpha', parent: 'c1', tags: [], note: '', completed: false },
    { id: 'p2', name: 'Hidden Parent', project: 'Alpha', parent: null, tags: [], note: '', completed: true },
    { id: 'c2', name: 'Visible Child of Hidden Parent', project: 'Alpha', parent: 'p2', tags: ['urgent'], note: 'still visible', completed: false },
    { id: 'i1', name: 'Inbox Root', project: null, parent: null, tags: ['home'], note: 'line1\nline2', completed: false },
  ];

  const tree = buildPerspectiveTaskTree(tasks as any[], { hideCompleted: true, inboxLabel: '收件箱' });
  assert.equal(tree.rootTasks.length, 3);

  const alpha = tree.projectGroups.find((group) => group.projectName === 'Alpha');
  assert.ok(alpha);
  assert.equal(alpha!.rootTasks.length, 2);
  assert.equal(alpha!.rootTasks[0].id, 'p1');
  assert.equal(alpha!.rootTasks[0].children[0].id, 'c1');
  assert.equal(alpha!.rootTasks[0].children[0].children[0].id, 'g1');
  assert.equal(alpha!.rootTasks[1].id, 'c2');

  assert.deepEqual(alpha!.rootTasks[0].displayTags, ['#focus']);
  assert.equal(alpha!.rootTasks[0].note, 'parent note');

  const inbox = tree.projectGroups.find((group) => group.projectName === '收件箱');
  assert.ok(inbox);
  assert.equal(inbox!.rootTasks.length, 1);
  assert.equal(inbox!.rootTasks[0].id, 'i1');
});

test('buildPerspectiveTaskTree tolerates self-parent cycle by keeping node as root', () => {
  const tasks = [
    { id: 'self', name: 'Self Loop', project: 'Alpha', parent: 'self', tags: [], note: '', completed: false },
  ];

  const tree = buildPerspectiveTaskTree(tasks as any[], { hideCompleted: true });
  assert.equal(tree.rootTasks.length, 1);
  assert.equal(tree.rootTasks[0].id, 'self');
  assert.equal(tree.rootTasks[0].children.length, 0);
});
