import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  dedupeExpandedTopLevelTasks,
  formatTaskTreeNode,
  subtaskCountLabel,
  TaskTreeNode,
} from './taskTreeFormatter.js';

function node(id: string, children: TaskTreeNode[] = []): TaskTreeNode {
  return {
    id,
    name: id,
    taskStatus: 'Available',
    childrenCount: children.length,
    children,
  };
}

test('subtaskCountLabel uses singular and plural consistently', () => {
  assert.equal(subtaskCountLabel(0), '[0 subtasks]');
  assert.equal(subtaskCountLabel(1), '[1 subtask]');
  assert.equal(subtaskCountLabel(2), '[2 subtasks]');
});

test('formatTaskTreeNode includes counts without expanding by default', () => {
  const output = formatTaskTreeNode(node('parent', [node('child')]), '1. ');
  assert.match(output, /parent \[1 subtask\]/);
  assert.doesNotMatch(output, /└──/);
});

test('formatTaskTreeNode recursively renders serialized children', () => {
  const output = formatTaskTreeNode(
    node('parent', [node('child', [node('grandchild')])]),
    '1. ',
    { showSubtasks: true },
  );

  assert.match(output, /└── ⚪ child \[1 subtask\]/);
  assert.match(output, /└── ⚪ grandchild \[0 subtasks\]/);
});

test('formatTaskTreeNode reports depth or safety truncation', () => {
  const parent = node('parent');
  parent.childrenCount = 2;
  parent.childrenTruncated = true;

  const output = formatTaskTreeNode(parent, '1. ', { showSubtasks: true });
  assert.match(output, /2 subtask\(s\) not expanded/);
});

test('dedupeExpandedTopLevelTasks removes a matching expanded descendant', () => {
  const child = node('child');
  const parent = node('parent', [child]);

  assert.deepEqual(dedupeExpandedTopLevelTasks([parent, child], true).map(task => task.id), ['parent']);
  assert.deepEqual(dedupeExpandedTopLevelTasks([parent, child], false).map(task => task.id), ['parent', 'child']);
});

test('serialized task nodes expose parent IDs for planning hierarchy', async () => {
  const source = await readFile(
    new URL('../../utils/omnifocusScripts/taskTreeHelpers.js', import.meta.url),
    'utf8',
  );
  assert.match(source, /parentId: task\.parent \? task\.parent\.id\.primaryKey : null/);
});
