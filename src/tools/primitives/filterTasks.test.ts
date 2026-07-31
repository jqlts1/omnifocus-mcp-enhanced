import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const STATUS = {
  Available: 'AVAILABLE',
  Blocked: 'BLOCKED',
  Completed: 'COMPLETED',
  Dropped: 'DROPPED',
  DueSoon: 'DUE_SOON',
  Next: 'NEXT',
  Overdue: 'OVERDUE',
};

interface TaskOverrides {
  name?: string;
  status?: string;
  dueDate?: Date | null;
  deferDate?: Date | null;
  plannedDate?: Date | null;
  completionDate?: Date | null;
  added?: Date | null;
  modified?: Date | null;
  estimatedMinutes?: number | null;
  note?: string;
  flagged?: boolean;
  inInbox?: boolean;
  projectName?: string | null;
  tags?: Array<
    string | { id: { primaryKey: string }; name: string; parent?: unknown }
  >;
  children?: any[];
}

function task(id: string, overrides: TaskOverrides = {}) {
  const projectName = overrides.projectName === undefined ? 'Alpha' : overrides.projectName;
  const value: any = {
    id: { primaryKey: id },
    name: overrides.name || id,
    note: overrides.note || '',
    taskStatus: overrides.status || STATUS.Available,
    flagged: overrides.flagged || false,
    dueDate: overrides.dueDate || null,
    deferDate: overrides.deferDate || null,
    plannedDate: overrides.plannedDate || null,
    completionDate: overrides.completionDate || null,
    added: overrides.added || null,
    modified: overrides.modified || null,
    estimatedMinutes: overrides.estimatedMinutes ?? null,
    inInbox: overrides.inInbox || false,
    containingProject: projectName
      ? { id: { primaryKey: `project-${projectName}` }, name: projectName }
      : null,
    tags: (overrides.tags || []).map((tag, index) => {
      if (typeof tag !== 'string') return tag;
      return {
        id: { primaryKey: `tag-${index}-${tag}` },
        name: tag,
        parent: null,
      };
    }),
    children: overrides.children || [],
  };
  value.children.forEach((child: any) => { child.parent = value; });
  return value;
}

function runFilter(tasks: any[], args: Record<string, unknown>, now = new Date()): any {
  const helper = readFileSync(
    new URL('../../utils/omnifocusScripts/taskTreeHelpers.js', import.meta.url),
    'utf8',
  );
  const filterScript = readFileSync(
    new URL('../../utils/omnifocusScripts/filterTasks.js', import.meta.url),
    'utf8',
  );
  const script = `${helper}\n${filterScript}`;

  class FixedDate extends Date {
    constructor(...values: any[]) {
      if (values.length === 0) {
        super(now.getTime());
      } else if (values.length === 1) {
        super(values[0]);
      } else {
        super(
          values[0],
          values[1],
          values[2] ?? 1,
          values[3] ?? 0,
          values[4] ?? 0,
          values[5] ?? 0,
          values[6] ?? 0,
        );
      }
    }

    static now(): number {
      return now.getTime();
    }
  }

  const result = vm.runInNewContext(script, {
    injectedArgs: args,
    flattenedTasks: tasks,
    Task: { Status: STATUS },
    Date: FixedDate,
    Set,
    Array,
    Number,
    String,
    JSON,
    Math,
    isNaN,
  });

  return JSON.parse(result);
}

const NOW = new Date(2026, 6, 29, 12, 0, 0); // Wednesday, local time
const local = (year: number, month: number, day: number, hour = 10) =>
  new Date(year, month - 1, day, hour, 0, 0);

test('filterTasks OmniJS defaults to remaining tasks and honors explicit statuses', () => {
  const tasks = [
    task('available'),
    task('completed', { status: STATUS.Completed, completionDate: local(2026, 7, 29) }),
    task('dropped', { status: STATUS.Dropped }),
  ];

  assert.deepEqual(runFilter(tasks, {}, NOW).tasks.map((item: any) => item.id), ['available']);
  assert.deepEqual(
    runFilter(tasks, { taskStatus: ['Completed'] }, NOW).tasks.map((item: any) => item.id),
    ['completed'],
  );
});

test('filterTasks OmniJS applies due filters using local calendar boundaries', () => {
  const tasks = [
    task('yesterday', { dueDate: local(2026, 7, 28) }),
    task('today', { dueDate: local(2026, 7, 29, 15) }),
    task('tomorrow', { dueDate: local(2026, 7, 30) }),
    task('next-week', { dueDate: local(2026, 8, 3) }),
  ];

  assert.deepEqual(runFilter(tasks, { dueToday: true }, NOW).tasks.map((item: any) => item.id), ['today']);
  assert.deepEqual(runFilter(tasks, { overdue: true }, NOW).tasks.map((item: any) => item.id), ['yesterday']);
  assert.deepEqual(
    runFilter(tasks, { dueThisWeek: true }, NOW).tasks.map((item: any) => item.id),
    ['today', 'tomorrow', 'yesterday'],
  );
  assert.deepEqual(
    runFilter(tasks, { dueAfter: '2026-07-29', dueBefore: '2026-08-01' }, NOW).tasks.map((item: any) => item.id),
    ['today', 'tomorrow'],
  );
});

test('filterTasks OmniJS applies defer and planned filters', () => {
  const tasks = [
    task('none'),
    task('past', { deferDate: local(2026, 7, 28), plannedDate: local(2026, 7, 28) }),
    task('today', { deferDate: local(2026, 7, 29), plannedDate: local(2026, 7, 29) }),
    task('future', { deferDate: local(2026, 8, 3), plannedDate: local(2026, 8, 3) }),
  ];

  assert.deepEqual(runFilter(tasks, { deferToday: true }, NOW).tasks.map((item: any) => item.id), ['today']);
  assert.deepEqual(
    runFilter(tasks, { deferAvailable: true }, NOW).tasks.map((item: any) => item.id),
    ['none', 'past', 'today'],
  );
  assert.deepEqual(runFilter(tasks, { plannedToday: true }, NOW).tasks.map((item: any) => item.id), ['today']);
  assert.deepEqual(
    runFilter(tasks, { plannedThisMonth: true }, NOW).tasks.map((item: any) => item.id),
    ['past', 'today'],
  );
});

test('filterTasks OmniJS applies completion day/week/month filters', () => {
  const tasks = [
    task('yesterday', { status: STATUS.Completed, completionDate: local(2026, 7, 28) }),
    task('today', { status: STATUS.Completed, completionDate: local(2026, 7, 29) }),
    task('last-month', { status: STATUS.Completed, completionDate: local(2026, 6, 30) }),
    task('remaining'),
  ];

  assert.deepEqual(runFilter(tasks, { completedToday: true }, NOW).tasks.map((item: any) => item.id), ['today']);
  assert.deepEqual(
    runFilter(tasks, { completedYesterday: true }, NOW).tasks.map((item: any) => item.id),
    ['yesterday'],
  );
  assert.deepEqual(
    runFilter(tasks, { completedThisWeek: true }, NOW).tasks.map((item: any) => item.id),
    ['today', 'yesterday'],
  );
  assert.deepEqual(
    runFilter(tasks, { completedThisMonth: true }, NOW).tasks.map((item: any) => item.id),
    ['today', 'yesterday'],
  );
});

test('filterTasks OmniJS applies tags, project, search, inbox, note, and estimate filters', () => {
  const tasks = [
    task('match', {
      name: 'Write report',
      note: 'Client summary',
      projectName: 'Website Redesign',
      tags: ['Deep Work'],
      estimatedMinutes: 30,
      inInbox: true,
      flagged: true,
    }),
    task('other', {
      name: 'Buy milk',
      projectName: 'Personal',
      tags: ['Errands'],
      estimatedMinutes: 90,
    }),
    task('empty-estimate', { note: '', estimatedMinutes: null }),
  ];

  const options = {
    tagFilter: 'deep',
    projectFilter: 'website',
    searchText: 'summary',
    inInbox: true,
    flagged: true,
    hasNote: true,
    hasEstimate: true,
    estimateMin: 20,
    estimateMax: 40,
  };

  assert.deepEqual(runFilter(tasks, options, NOW).tasks.map((item: any) => item.id), ['match']);
  assert.deepEqual(
    runFilter(tasks, { tagFilter: 'Deep Work', exactTagMatch: true }, NOW).tasks.map((item: any) => item.id),
    ['match'],
  );
  assert.deepEqual(
    runFilter(tasks, { hasEstimate: false }, NOW).tasks.map((item: any) => item.id),
    ['empty-estimate'],
  );
});

test('filterTasks OmniJS sorts before applying limit and reports full filtered count', () => {
  const tasks = [task('c', { name: 'Charlie' }), task('a', { name: 'Alpha' }), task('b', { name: 'Bravo' })];
  const result = runFilter(tasks, { sortBy: 'name', sortOrder: 'asc', limit: 2 }, NOW);

  assert.equal(result.filteredCount, 3);
  assert.equal(result.returnedCount, 2);
  assert.equal(result.hasMore, true);
  assert.deepEqual(result.tasks.map((item: any) => item.name), ['Alpha', 'Bravo']);
});

test('filterTasks OmniJS traverses stable keyset pages without duplicates', () => {
  const tasks = [
    task('c', { name: 'Same' }),
    task('a', { name: 'Same' }),
    task('b', { name: 'Same' }),
    task('d', { name: 'Zulu' }),
  ];
  const first = runFilter(tasks, { sortBy: 'name', sortOrder: 'asc', limit: 2 }, NOW);
  const second = runFilter(tasks, {
    sortBy: 'name',
    sortOrder: 'asc',
    limit: 2,
    continuation: {
      sortBy: 'name',
      sortOrder: 'asc',
      lastValue: first.lastSortTuple.value,
      lastId: first.lastSortTuple.id,
    },
  }, NOW);

  assert.deepEqual(first.tasks.map((item: any) => item.id), ['a', 'b']);
  assert.deepEqual(second.tasks.map((item: any) => item.id), ['c', 'd']);
  assert.equal(first.hasMore, true);
  assert.equal(second.hasMore, false);
  assert.equal(second.filteredCount, 4);
});

test('filterTasks OmniJS supports all stable sort fields', () => {
  const fields = ['deferDate', 'plannedDate', 'completedDate', 'flagged', 'project'];
  const tasks = [
    task('b', {
      deferDate: local(2026, 7, 30), plannedDate: local(2026, 7, 30),
      completionDate: local(2026, 7, 30), flagged: true, projectName: 'Zulu',
    }),
    task('a', {
      deferDate: local(2026, 7, 29), plannedDate: local(2026, 7, 29),
      completionDate: local(2026, 7, 29), flagged: false, projectName: 'Alpha',
    }),
  ];
  fields.forEach(sortBy => {
    const result = runFilter(tasks, {
      sortBy, sortOrder: 'asc', taskStatus: sortBy === 'completedDate' ? ['Available'] : undefined,
    }, NOW);
    assert.deepEqual(result.tasks.map((item: any) => item.id), ['a', 'b'], sortBy);
  });
});

test('filterTasks OmniJS applies best-effort boundaries to changed live data', () => {
  const original = [
    task('a', { name: 'Alpha' }), task('b', { name: 'Bravo' }), task('c', { name: 'Charlie' }),
  ];
  const first = runFilter(original, { sortBy: 'name', limit: 2 }, NOW);
  const continuation = {
    sortBy: 'name', sortOrder: 'asc',
    lastValue: first.lastSortTuple.value, lastId: first.lastSortTuple.id,
  };
  const changed = [
    task('new-before', { name: 'Aardvark' }),
    task('c', { name: 'Charlie' }),
    task('new-after', { name: 'Delta' }),
  ];
  const second = runFilter(changed, { sortBy: 'name', limit: 10, continuation }, NOW);
  assert.deepEqual(second.tasks.map((item: any) => item.id), ['c', 'new-after']);
});

test('filterTasks OmniJS paginates null-last values in both directions', () => {
  const tasks = [
    task('none-b'), task('dated', { dueDate: local(2026, 7, 29) }), task('none-a'),
  ];
  const first = runFilter(tasks, { sortBy: 'dueDate', sortOrder: 'desc', limit: 2 }, NOW);
  const second = runFilter(tasks, {
    sortBy: 'dueDate', sortOrder: 'desc', limit: 2,
    continuation: { sortBy: 'dueDate', sortOrder: 'desc', ...first.lastSortTuple, lastValue: first.lastSortTuple.value, lastId: first.lastSortTuple.id },
  }, NOW);
  assert.deepEqual(first.tasks.map((item: any) => item.id), ['dated', 'none-b']);
  assert.deepEqual(second.tasks.map((item: any) => item.id), ['none-a']);
});

test('filterTasks OmniJS serializes full assigned tag paths', () => {
  const team = { id: { primaryKey: 'tag-team' }, name: '团队', parent: null };
  const member = {
    id: { primaryKey: 'tag-member' },
    name: '守一',
    parent: team,
  };
  const result = runFilter([task('nested', { tags: [member] })], {}, NOW);

  assert.deepEqual(JSON.parse(JSON.stringify(result.tasks[0].tags)), [
    {
      id: 'tag-member',
      name: '守一',
      path: '团队 / 守一',
      ancestorIds: ['tag-team'],
    },
  ]);
});

test('filterTasks OmniJS bounds cyclic tag parents', () => {
  const first: { id: { primaryKey: string }; name: string; parent: unknown } = {
    id: { primaryKey: 'tag-a' },
    name: 'A',
    parent: null,
  };
  const second = {
    id: { primaryKey: 'tag-b' },
    name: 'B',
    parent: first,
  };
  first.parent = second;
  const result = runFilter([
    task('cyclic', { tags: [first] }),
  ], {}, NOW);

  assert.equal(result.tasks[0].tags[0].name, 'A');
  assert.match(result.tasks[0].tags[0].path, /A/);
});

test('filterTasks OmniJS compact serialization omits notes and tags', () => {
  const result = runFilter([
    task('private', { note: 'secret', tags: ['private'] }),
  ], { outputMode: 'compact' }, NOW);
  assert.equal('note' in result.tasks[0], false);
  assert.equal('tags' in result.tasks[0], false);
});

test('filterTasks OmniJS keeps top-level page slots independent of expanded descendants', () => {
  const child = task('child', { name: 'Child' });
  const first = task('first', { name: 'Alpha', children: [child] });
  const second = task('second', { name: 'Bravo' });
  const result = runFilter([first, child, second], {
    sortBy: 'name', limit: 1, showSubtasks: true, maxSubtaskDepth: 2,
  }, NOW);
  assert.equal(result.returnedCount, 1);
  assert.equal(result.hasMore, true);
  assert.equal(result.lastSortTuple.id, 'first');
  assert.deepEqual(Array.from(result.tasks[0].children, (item: any) => item.id), ['child']);
});

test('filterTasks countOnly uses the identical predicate and returns status aggregates', () => {
  const tasks = [
    task('one', { note: 'has note', status: STATUS.Available }),
    task('two', { note: 'also note', status: STATUS.Blocked }),
    task('three', { note: '' }),
  ];

  const listed = runFilter(tasks, { hasNote: true, limit: 100 }, NOW);
  const counted = runFilter(tasks, { hasNote: true, countOnly: true }, NOW);

  assert.equal(counted.success, true);
  assert.equal(counted.total, listed.filteredCount);
  assert.deepEqual(counted.byStatus, { Available: 1, Blocked: 1 });
  assert.equal(counted.tasks, undefined);
  assert.equal(listed.byStatus, undefined);
});

test('filterTasks local date-only parsing remains stable across DST boundaries', () => {
  const dstNow = new Date(2026, 2, 9, 12, 0, 0); // day after US spring-forward
  const tasks = [
    task('today', { dueDate: new Date(2026, 2, 9, 0, 30, 0) }),
    task('yesterday', { dueDate: new Date(2026, 2, 8, 23, 30, 0) }),
  ];

  assert.deepEqual(
    runFilter(tasks, { dueToday: true }, dstNow).tasks.map((item: any) => item.id),
    ['today'],
  );
});

test('filterTasks OmniJS applies created date filters (stale detection)', () => {
  const tasks = [
    task('fresh', { added: local(2026, 7, 28), modified: local(2026, 7, 29) }),
    task('stale', { added: local(2026, 6, 1), modified: local(2026, 6, 15) }),
    task('old', { added: local(2026, 5, 10), modified: local(2026, 5, 20) }),
    task('no-date', {}),
  ];

  // createdBefore: tasks created before July
  const beforeJuly = runFilter(tasks, { createdBefore: '2026-07-01' }, NOW);
  assert.deepEqual(beforeJuly.tasks.map((item: any) => item.id), ['old', 'stale']);

  // createdAfter: tasks created after June 15
  const afterJune15 = runFilter(tasks, { createdAfter: '2026-06-15' }, NOW);
  assert.deepEqual(afterJune15.tasks.map((item: any) => item.id), ['fresh']);

  // Both createdBefore and createdAfter (range)
  const range = runFilter(tasks, { createdAfter: '2026-06-01', createdBefore: '2026-07-15' }, NOW);
  assert.deepEqual(range.tasks.map((item: any) => item.id), ['stale']);

  // Tasks with no added date are excluded
  assert.equal(beforeJuly.tasks.some((item: any) => item.id === 'no-date'), false);
});

test('filterTasks OmniJS applies modified date filters (stale detection)', () => {
  const tasks = [
    task('recent', { modified: local(2026, 7, 29) }),
    task('stale', { modified: local(2026, 6, 1) }),
    task('very-stale', { modified: local(2026, 5, 1) }),
    task('no-date', {}),
  ];

  // modifiedBefore: tasks not modified since July
  const beforeJuly = runFilter(tasks, { modifiedBefore: '2026-07-01' }, NOW);
  assert.deepEqual(beforeJuly.tasks.map((item: any) => item.id), ['stale', 'very-stale']);

  // modifiedAfter: tasks modified after June 15
  const afterJune15 = runFilter(tasks, { modifiedAfter: '2026-06-15' }, NOW);
  assert.deepEqual(afterJune15.tasks.map((item: any) => item.id), ['recent']);

  // Stale detection: tasks not modified in 30+ days
  const staleThreshold = new Date(2026, 5, 29); // June 29 = 30 days before NOW
  const staleDateStr = staleThreshold.toISOString();
  const stale = runFilter(tasks, { modifiedBefore: staleDateStr }, NOW);
  assert.deepEqual(stale.tasks.map((item: any) => item.id), ['stale', 'very-stale']);
});

test('filterTasks OmniJS created/modified filters exclude tasks with no dates', () => {
  const tasks = [
    task('with-date', { added: local(2026, 7, 1), modified: local(2026, 7, 15) }),
    task('no-added', { modified: local(2026, 7, 15) }),
    task('no-modified', { added: local(2026, 7, 1) }),
    task('neither', {}),
  ];

  const createdResult = runFilter(tasks, { createdAfter: '2026-06-01' }, NOW);
  assert.deepEqual(createdResult.tasks.map((item: any) => item.id), ['no-modified', 'with-date']);

  const modifiedResult = runFilter(tasks, { modifiedAfter: '2026-07-01' }, NOW);
  assert.deepEqual(modifiedResult.tasks.map((item: any) => item.id), ['no-added', 'with-date']);
});
