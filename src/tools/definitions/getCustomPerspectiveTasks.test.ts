import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveCustomPerspectiveDisplayMode } from './getCustomPerspectiveTasks.js';

test('resolveCustomPerspectiveDisplayMode respects explicit displayMode', () => {
  const mode = resolveCustomPerspectiveDisplayMode({
    perspectiveName: 'Today',
    displayMode: 'flat',
    showHierarchy: true,
    groupByProject: true,
  });

  assert.equal(mode, 'flat');
});

test('resolveCustomPerspectiveDisplayMode maps legacy params to task_tree', () => {
  const mode = resolveCustomPerspectiveDisplayMode({
    perspectiveName: 'Today',
    showHierarchy: true,
  });

  assert.equal(mode, 'task_tree');
});

test('resolveCustomPerspectiveDisplayMode maps legacy params to flat when groupByProject is false', () => {
  const mode = resolveCustomPerspectiveDisplayMode({
    perspectiveName: 'Today',
    groupByProject: false,
  });

  assert.equal(mode, 'flat');
});

test('resolveCustomPerspectiveDisplayMode defaults to project_tree', () => {
  const mode = resolveCustomPerspectiveDisplayMode({
    perspectiveName: 'Today',
  });

  assert.equal(mode, 'project_tree');
});
