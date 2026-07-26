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
  estimatedMinutes?: number | null;
  note?: string;
  flagged?: boolean;
  inInbox?: boolean;
  projectName?: string | null;
  tags?: string[];
}

function task(id: string, overrides: TaskOverrides = {}) {
  const projectName = overrides.projectName === undefined ? 'Alpha' : overrides.projectName;
  return {
    id: { primaryKey: id },
    name: overrides.name || id,
    note: overrides.note || '',
    taskStatus: overrides.status || STATUS.Available,
    flagged: overrides.flagged || false,
    dueDate: overrides.dueDate || null,
    deferDate: overrides.deferDate || null,
    plannedDate: overrides.plannedDate || null,
    completionDate: overrides.completionDate || null,
    estimatedMinutes: overrides.estimatedMinutes ?? null,
    inInbox: overrides.inInbox || false,
    containingProject: projectName
      ? { id: { primaryKey: `project-${projectName}` }, name: projectName }
      : null,
    tags: (overrides.tags || []).map((name, index) => ({
      id: { primaryKey: `tag-${index}-${name}` },
      name,
    })),
  };
}

function runFilter(tasks: any[], args: Record<string, unknown>, now = new Date()): any {
  const script = readFileSync(
    new URL('../../utils/omnifocusScripts/filterTasks.js', import.meta.url),
    'utf8',
  );

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
  assert.deepEqual(result.tasks.map((item: any) => item.name), ['Alpha', 'Bravo']);
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
