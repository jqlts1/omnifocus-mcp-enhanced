import assert from 'node:assert/strict';
import test from 'node:test';
import { getPerspectiveTasksV2 } from './getPerspectiveTasksV2.js';
import { PerspectiveEngine } from '../../utils/perspectiveEngine.js';

test('getPerspectiveTasksV2 returns projectTree when displayMode is project_tree', async () => {
  const original = PerspectiveEngine.prototype.getFilteredTasks;

  PerspectiveEngine.prototype.getFilteredTasks = async () => ({
    success: true,
    tasks: [
      {
        id: 'p1',
        name: 'Parent',
        note: 'parent note',
        completed: false,
        dropped: false,
        flagged: true,
        projectName: 'Alpha',
        parentTaskInfo: undefined,
        tags: ['focus'],
      },
      {
        id: 'c1',
        name: 'Child',
        note: '',
        completed: false,
        dropped: false,
        flagged: false,
        projectName: 'Alpha',
        parentTaskInfo: { id: 'p1', name: 'Parent' },
        tags: [{ id: 't1', name: 'client' }],
      },
    ] as any[],
    perspectiveInfo: {
      name: 'Today',
      rulesCount: 1,
      aggregation: 'perspective_native',
    },
  });

  try {
    const result = await getPerspectiveTasksV2({
      perspectiveName: 'Today',
      displayMode: 'project_tree',
    } as any);

    assert.equal(result.success, true);
    assert.equal(result.displayMode, 'project_tree');
    assert.ok(result.projectTree);
    assert.equal(result.projectTree![0].projectName, 'Alpha');
    assert.equal(result.projectTree![0].rootTasks[0].children[0].id, 'c1');
    assert.deepEqual(result.projectTree![0].rootTasks[0].displayTags, ['#focus']);
  } finally {
    PerspectiveEngine.prototype.getFilteredTasks = original;
  }
});

test('getPerspectiveTasksV2 returns taskTree when displayMode is task_tree', async () => {
  const original = PerspectiveEngine.prototype.getFilteredTasks;

  PerspectiveEngine.prototype.getFilteredTasks = async () => ({
    success: true,
    tasks: [
      {
        id: 'r1',
        name: 'Root',
        note: 'root note',
        completed: false,
        dropped: false,
        flagged: false,
        projectName: 'Alpha',
        parentTaskInfo: undefined,
        tags: [],
      },
      {
        id: 'r2',
        name: 'Another Root',
        note: '',
        completed: false,
        dropped: false,
        flagged: false,
        projectName: null,
        parentTaskInfo: undefined,
        tags: [],
      },
    ] as any[],
    perspectiveInfo: {
      name: 'Today',
      rulesCount: 1,
      aggregation: 'perspective_native',
    },
  });

  try {
    const result = await getPerspectiveTasksV2({
      perspectiveName: 'Today',
      displayMode: 'task_tree',
    } as any);

    assert.equal(result.success, true);
    assert.equal(result.displayMode, 'task_tree');
    assert.ok(result.taskTree);
    assert.equal(result.taskTree!.length, 2);
    assert.equal(result.projectTree, undefined);
  } finally {
    PerspectiveEngine.prototype.getFilteredTasks = original;
  }
});
