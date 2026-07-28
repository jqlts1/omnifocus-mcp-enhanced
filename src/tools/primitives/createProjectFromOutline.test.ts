import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import {
  buildProjectOutlinePlan,
  type ProjectOutline,
} from './createProjectFromOutline.js';

interface FakeTag {
  id: { primaryKey: string };
  name: string;
  active: boolean;
  parent?: FakeTag & { childrenAreMutuallyExclusive?: boolean };
}

interface FakeFolder {
  id: { primaryKey: string };
  name: string;
  ending: { folder: FakeFolder };
  active: boolean;
}

interface FakeItem {
  id: { primaryKey: string };
  name: string;
  note: string;
  tags: FakeTag[];
  dueDate: Date | null;
  deferDate: Date | null;
  plannedDate: Date | null;
  flagged: boolean;
  estimatedMinutes: number | null;
  sequential: boolean;
  parent: FakeItem | null;
  containingProject: FakeItem | null;
  children: FakeItem[];
  flattenedTasks: FakeItem[];
  parentFolder: FakeFolder | null;
  repetitionRule: {
    ruleString: string;
    scheduleType: string | null;
    anchorDateKey: string | null;
    catchUpAutomatically: boolean;
  } | null;
  ending: { parent: FakeItem };
  addTag(tag: FakeTag): void;
}

interface RunOptions {
  folders?: FakeFolder[];
  tags?: FakeTag[];
  failTaskName?: string;
  corrupt?:
    | 'parent'
    | 'tag'
    | 'name'
    | 'note'
    | 'dueDate'
    | 'deferDate'
    | 'plannedDate'
    | 'flagged'
    | 'estimatedMinutes'
    | 'sequential'
    | 'count'
    | 'folder'
    | 'repetition';
  canUndo?: boolean;
  undoThrows?: boolean;
}

function tag(
  id: string,
  active = true,
  parent?: FakeTag & { childrenAreMutuallyExclusive?: boolean },
): FakeTag {
  return { id: { primaryKey: id }, name: id, active, parent };
}
function folder(id: string, active = true): FakeFolder {
  const value = { id: { primaryKey: id }, name: id, active } as FakeFolder;
  value.ending = { folder: value };
  return value;
}

function runOutline(outline: ProjectOutline, options: RunOptions = {}) {
  const script = readFileSync(
    new URL(
      '../../utils/omnifocusScripts/createProjectFromOutline.js',
      import.meta.url,
    ),
    'utf8',
  );
  const plan = buildProjectOutlinePlan(outline);
  const flattenedProjects: FakeItem[] = [];
  const flattenedTasks: FakeItem[] = [];
  const flattenedFolders = options.folders || [];
  const flattenedTags = options.tags || [];
  let nextId = 1;
  let createdProject: FakeItem | null = null;
  let undoCalls = 0;

  const makeItem = (
    name: string,
    parent: FakeItem | null,
    project: FakeItem | null,
  ): FakeItem => {
    const item: FakeItem = {
      id: { primaryKey: `created-${nextId++}` },
      name,
      note: '',
      tags: [],
      dueDate: null,
      deferDate: null,
      plannedDate: null,
      flagged: false,
      estimatedMinutes: null,
      sequential: false,
      parent,
      containingProject: project,
      children: [],
      flattenedTasks: [],
      parentFolder: null,
      repetitionRule: null,
      ending: { parent: undefined as unknown as FakeItem },
      addTag(assignedTag: FakeTag) {
        if (options.corrupt === 'tag') return;
        if (assignedTag.parent?.childrenAreMutuallyExclusive) {
          this.tags = this.tags.filter(
            (current) => current.parent !== assignedTag.parent,
          );
        }
        this.tags.push(assignedTag);
      },
    };
    if (options.corrupt === 'name') item.name = `${item.name} changed`;
    const corruptField = options.corrupt;
    if (
      corruptField === 'note' ||
      corruptField === 'dueDate' ||
      corruptField === 'deferDate' ||
      corruptField === 'plannedDate' ||
      corruptField === 'flagged' ||
      corruptField === 'estimatedMinutes' ||
      corruptField === 'sequential'
    ) {
      let storedValue = item[corruptField];
      Object.defineProperty(item, corruptField, {
        get: () => storedValue,
        set: (value) => {
          if (corruptField === 'note')
            storedValue = `${String(value)} changed` as never;
          else if (corruptField.endsWith('Date'))
            storedValue = new Date(0) as never;
          else if (corruptField === 'estimatedMinutes')
            storedValue = 999 as never;
          else storedValue = !value as never;
        },
        enumerable: true,
      });
    }
    item.ending = { parent: item };
    return item;
  };

  class ProjectConstructor {
    constructor(name: string, position?: { folder: FakeFolder } | null) {
      const project = makeItem(name, null, null);
      project.containingProject = project;
      project.parentFolder =
        options.corrupt === 'folder' ? null : position?.folder || null;
      createdProject = project;
      flattenedProjects.push(project);
      return project;
    }
  }

  const SCHEDULE_TYPES = {
    Regularly: 'REGULARLY',
    FromCompletion: 'FROM_COMPLETION',
  };
  const ANCHOR_DATE_KEYS = {
    DueDate: 'DUE',
    DeferDate: 'DEFER',
    PlannedDate: 'PLANNED',
  };

  class TaskConstructor {
    static RepetitionScheduleType = SCHEDULE_TYPES;
    static AnchorDateKey = ANCHOR_DATE_KEYS;
    static RepetitionRule = class {
      constructor(
        ruleString: string,
        _method: unknown,
        scheduleType: string | null,
        anchorDateKey: string | null,
        catchUpAutomatically: boolean,
      ) {
        return {
          ruleString:
            options.corrupt === 'repetition' ? 'FREQ=DAILY' : ruleString,
          scheduleType,
          anchorDateKey,
          catchUpAutomatically,
        } as never;
      }
    };

    constructor(name: string, parent: FakeItem) {
      if (name === options.failTaskName)
        throw new Error('simulated create failure');
      const project = parent.containingProject || parent;
      const task = makeItem(name, parent === project ? null : parent, project);
      if (options.corrupt === 'parent' && name === 'Child') task.parent = null;
      parent.children.push(task);
      if (options.corrupt !== 'count') project.flattenedTasks.push(task);
      flattenedTasks.push(task);
      task.tags = [...parent.tags];
      return task;
    }
  }

  const document = {
    get canUndo() {
      return options.canUndo !== false && createdProject !== null;
    },
    undo() {
      undoCalls += 1;
      if (options.undoThrows) throw new Error('simulated undo failure');
      if (!createdProject) return;
      const projectIndex = flattenedProjects.indexOf(createdProject);
      if (projectIndex >= 0) flattenedProjects.splice(projectIndex, 1);
      for (let index = flattenedTasks.length - 1; index >= 0; index -= 1) {
        if (flattenedTasks[index].containingProject === createdProject) {
          flattenedTasks.splice(index, 1);
        }
      }
      createdProject = null;
    },
  };

  const raw = vm.runInNewContext(script, {
    injectedArgs: { plan },
    flattenedProjects,
    flattenedTasks,
    flattenedFolders,
    flattenedTags,
    Project: ProjectConstructor,
    Task: TaskConstructor,
    document,
    JSON,
    String,
    Number,
    Date,
    Array,
    Set,
    Math,
    Map,
    Object,
    Error,
  });
  return {
    result: JSON.parse(raw),
    flattenedProjects,
    flattenedTasks,
    undoCalls,
  };
}

test('project outline plan is depth-first with stable parent indices and deduplicated tags', () => {
  const plan = buildProjectOutlinePlan({
    name: 'Project',
    tagIds: ['tag-1'],
    tasks: [
      {
        name: 'Parent',
        tagIds: ['tag-1', 'tag-2'],
        children: [{ name: 'Child', tagIds: ['tag-2'] }],
      },
      { name: 'Sibling' },
    ],
  });

  assert.deepEqual(
    plan.tasks.map((node) => [node.path, node.parentPlanIndex]),
    [
      ['Project/Parent', null],
      ['Project/Parent/Child', 0],
      ['Project/Sibling', null],
    ],
  );
  assert.deepEqual(plan.tagIds, ['tag-1', 'tag-2']);
});

test('project outline primitive rechecks invalid input boundaries', () => {
  assert.throws(() => buildProjectOutlinePlan({ name: ' ' }), /name/);
  assert.throws(
    () => buildProjectOutlinePlan({ name: 'Project', dueDate: 'bad-date' }),
    /dueDate/,
  );
  assert.throws(
    () =>
      buildProjectOutlinePlan({
        name: 'Project',
        tasks: [{ name: 'Task', estimatedMinutes: -1 }],
      }),
    /estimatedMinutes/,
  );
});

test('project outline preflights all stable references before writing', () => {
  const run = runOutline(
    {
      name: 'Project',
      folderId: 'missing-folder',
      tagIds: ['tag-1'],
    },
    { tags: [tag('tag-1')] },
  );

  assert.equal(run.result.success, false);
  assert.equal(run.result.code, 'REFERENCE_NOT_FOUND');
  assert.equal(run.flattenedProjects.length, 0);
});

test('project outline rejects inactive folder and tag references before writing', () => {
  for (const options of [
    { folders: [folder('folder-1', false)] },
    { tags: [tag('tag-1', false)] },
  ]) {
    const run = runOutline(
      {
        name: 'Project',
        folderId: options.folders ? 'folder-1' : undefined,
        tagIds: options.tags ? ['tag-1'] : undefined,
      },
      options,
    );
    assert.equal(run.result.code, 'REFERENCE_NOT_FOUND');
    assert.equal(run.flattenedProjects.length, 0);
  }
});

test('project outline creates and verifies a three-level project tree', () => {
  const targetFolder = folder('folder-1');
  const run = runOutline(
    {
      name: 'Project',
      note: 'Outcome',
      folderId: 'folder-1',
      tagIds: ['tag-1'],
      dueDate: '2026-08-30T10:00:00Z',
      sequential: true,
      tasks: [
        {
          name: 'Parent',
          estimatedMinutes: 60,
          children: [{ name: 'Child', plannedDate: '2026-08-01' }],
        },
      ],
    },
    { folders: [targetFolder], tags: [tag('tag-1')] },
  );

  assert.equal(run.result.success, true);
  assert.equal(run.result.taskCount, 2);
  assert.equal(run.result.items.length, 3);
  assert.equal(
    run.result.items.every((item: { verified: boolean }) => item.verified),
    true,
  );
  assert.equal(
    run.flattenedProjects[0].parentFolder?.id.primaryKey,
    'folder-1',
  );
});

test('project outline verifies OmniFocus mutually exclusive tag replacement', () => {
  const parent = {
    id: { primaryKey: 'group-1' },
    name: 'Exclusive group',
    active: true,
    childrenAreMutuallyExclusive: true,
  };
  const first = tag('tag-1', true, parent);
  const second = tag('tag-2', true, parent);
  const run = runOutline(
    {
      name: 'Project',
      tagIds: ['tag-1', 'tag-2'],
      tasks: [{ name: 'Task' }],
    },
    { tags: [first, second] },
  );

  assert.equal(run.result.success, true);
  assert.deepEqual(
    run.flattenedProjects[0].tags.map((item) => item.id.primaryKey),
    ['tag-2'],
  );
});

test('project outline rolls back after a mid-tree creation failure', () => {
  const run = runOutline(
    {
      name: 'Project',
      tasks: [{ name: 'First' }, { name: 'Fail' }],
    },
    { failTaskName: 'Fail' },
  );

  assert.equal(run.result.success, false);
  assert.equal(run.result.code, 'CREATE_FAILED_ROLLED_BACK');
  assert.equal(run.flattenedProjects.length, 0);
  assert.equal(run.flattenedTasks.length, 0);
  assert.equal(run.undoCalls, 1);
});

test('project outline rolls back a parent or tag verification mismatch', () => {
  for (const corrupt of ['parent', 'tag'] as const) {
    const run = runOutline(
      {
        name: 'Project',
        tagIds: ['tag-1'],
        tasks: [{ name: 'Parent', children: [{ name: 'Child' }] }],
      },
      { tags: [tag('tag-1')], corrupt },
    );
    assert.equal(run.result.code, 'VERIFICATION_FAILED_ROLLED_BACK');
    assert.equal(run.flattenedProjects.length, 0);
  }
});

test('project outline verifies every supported core field plus folder and count', () => {
  const corruptions = [
    'name',
    'note',
    'dueDate',
    'deferDate',
    'plannedDate',
    'flagged',
    'estimatedMinutes',
    'sequential',
    'folder',
    'count',
  ] as const;

  for (const corrupt of corruptions) {
    const run = runOutline(
      {
        name: 'Project',
        note: 'Expected note',
        folderId: 'folder-1',
        dueDate: '2026-08-30T10:00:00Z',
        deferDate: '2026-08-01T10:00:00Z',
        plannedDate: '2026-08-02T10:00:00Z',
        flagged: true,
        estimatedMinutes: 30,
        sequential: true,
        tasks: [{ name: 'Task' }],
      },
      { folders: [folder('folder-1')], corrupt },
    );
    assert.equal(run.result.code, 'VERIFICATION_FAILED_ROLLED_BACK', corrupt);
    assert.equal(run.flattenedProjects.length, 0, corrupt);
  }
});

test('project outline reports a residual project when rollback is unavailable', () => {
  const run = runOutline(
    { name: 'Project', tasks: [{ name: 'Fail' }] },
    { failTaskName: 'Fail', canUndo: false },
  );

  assert.equal(run.result.success, false);
  assert.equal(run.result.code, 'ROLLBACK_UNCONFIRMED');
  assert.equal(typeof run.result.residualProjectId, 'string');
  assert.equal(run.flattenedProjects.length, 1);
  assert.match(run.result.recovery, /Delete project/);
});

test('project outline does not consume older undo history after its transaction', () => {
  const run = runOutline(
    { name: 'Project', tasks: [{ name: 'Fail' }] },
    { failTaskName: 'Fail' },
  );

  assert.equal(run.result.code, 'CREATE_FAILED_ROLLED_BACK');
  assert.equal(run.undoCalls, 1);
});

test('project outline reports a residual project when Undo throws', () => {
  const run = runOutline(
    { name: 'Project', tasks: [{ name: 'Fail' }] },
    { failTaskName: 'Fail', undoThrows: true },
  );

  assert.equal(run.result.code, 'ROLLBACK_UNCONFIRMED');
  assert.equal(run.undoCalls, 1);
  assert.equal(run.flattenedProjects.length, 1);
});

test('project outline creates and verifies a repeating task', () => {
  const run = runOutline({
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
  });

  assert.equal(run.result.success, true);
  assert.equal(
    run.flattenedTasks[0].repetitionRule?.ruleString,
    'FREQ=WEEKLY;BYDAY=FR',
  );
});

test('project outline rolls back when the applied repetition disagrees', () => {
  const run = runOutline(
    {
      name: 'Admin',
      tasks: [
        { name: 'Weekly checklist', repetition: { ruleString: 'FREQ=WEEKLY' } },
      ],
    },
    { corrupt: 'repetition' },
  );

  assert.equal(run.result.code, 'VERIFICATION_FAILED_ROLLED_BACK');
  assert.match(run.result.error, /repetition\.ruleString/);
  assert.equal(run.flattenedProjects.length, 0);
});

test('project outline rejects an invalid repetition rule before writing', () => {
  assert.throws(
    () =>
      buildProjectOutlinePlan({
        name: 'Admin',
        tasks: [{ name: 'Task', repetition: { ruleString: 'INTERVAL=2' } }],
      }),
    /FREQ=/,
  );
});
