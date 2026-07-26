import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const PROJECT_STATUS = {
  Active: 'ACTIVE',
  Done: 'DONE',
  Dropped: 'DROPPED',
  OnHold: 'ON_HOLD',
};

function project(id: string, options: Record<string, any> = {}) {
  return {
    id: { primaryKey: id },
    name: options.name || id,
    status: options.status || PROJECT_STATUS.Active,
    parentFolder: options.folderName
      ? { id: { primaryKey: `folder-${options.folderName}` }, name: options.folderName }
      : null,
    task: { sequential: options.sequential || false },
    dueDate: options.dueDate || null,
    deferDate: options.deferDate || null,
    effectiveDueDate: options.dueDate || null,
    effectiveDeferDate: options.deferDate || null,
    completedByChildren: false,
    containsSingletonActions: false,
    note: options.note || '',
    tasks: options.tasks || [],
    flagged: options.flagged || false,
    nextReviewDate: options.nextReviewDate || null,
    lastReviewDate: options.lastReviewDate || null,
    reviewInterval: options.reviewInterval || null,
  };
}

function runScript(fileName: string, projects: any[], args: Record<string, unknown>, now?: Date) {
  const script = readFileSync(
    new URL(`../../utils/omnifocusScripts/${fileName}`, import.meta.url),
    'utf8',
  );

  class FixedDate extends Date {
    constructor(...values: any[]) {
      if (values.length === 0 && now) super(now.getTime());
      else if (values.length === 0) super();
      else if (values.length === 1) super(values[0]);
      else super(values[0], values[1], values[2] ?? 1, values[3] ?? 0, values[4] ?? 0, values[5] ?? 0, values[6] ?? 0);
    }

    static now(): number {
      return now ? now.getTime() : Date.now();
    }
  }

  return JSON.parse(vm.runInNewContext(script, {
    injectedArgs: args,
    flattenedProjects: projects,
    Project: { Status: PROJECT_STATUS },
    Date: FixedDate,
    Set,
    JSON,
    String,
  }));
}

test('getProjects OmniJS filters multiple statuses and folder names', () => {
  const projects = [
    project('active-work', { status: PROJECT_STATUS.Active, folderName: 'Client Work' }),
    project('hold-work', { status: PROJECT_STATUS.OnHold, folderName: 'Client Work' }),
    project('done-personal', { status: PROJECT_STATUS.Done, folderName: 'Personal' }),
  ];

  const result = runScript('getProjects.js', projects, {
    statusFilter: ['Active', 'OnHold'],
    folderFilter: 'client',
    includeReviewData: true,
  });

  assert.equal(result.count, 2);
  assert.deepEqual(result.projects.map((item: any) => item.id), ['active-work', 'hold-work']);
});

test('getProjects OmniJS can omit review data and serialize intervals', () => {
  const reviewed = project('reviewed', {
    nextReviewDate: new Date('2026-08-01T10:00:00.000Z'),
    lastReviewDate: new Date('2026-07-25T10:00:00.000Z'),
    reviewInterval: { steps: 1, unit: 'weeks', fixed: true },
  });

  const included = runScript('getProjects.js', [reviewed], { includeReviewData: true });
  assert.deepEqual(included.projects[0].reviewInterval, { steps: 1, unit: 'weeks', fixed: true });
  assert.equal(included.projects[0].nextReviewDate, '2026-08-01T10:00:00.000Z');

  const omitted = runScript('getProjects.js', [reviewed], { includeReviewData: false });
  assert.equal('nextReviewDate' in omitted.projects[0], false);
  assert.equal('reviewInterval' in omitted.projects[0], false);
});

test('getProjects OmniJS skips one malformed project without failing the list', () => {
  const malformed = project('bad');
  Object.defineProperty(malformed, 'name', { get() { throw new Error('broken project'); } });
  const result = runScript('getProjects.js', [malformed, project('good')], {});

  assert.equal(result.count, 1);
  assert.equal(result.projects[0].id, 'good');
});

test('getProjectsDueForReview includes equality boundary and sorts most overdue first', () => {
  const now = new Date('2026-07-29T12:00:00.000Z');
  const projects = [
    project('later', { nextReviewDate: new Date('2026-07-29T12:00:00.000Z') }),
    project('earlier', { nextReviewDate: new Date('2026-07-01T12:00:00.000Z') }),
    project('future', { nextReviewDate: new Date('2026-07-30T12:00:00.000Z') }),
    project('done', { status: PROJECT_STATUS.Done, nextReviewDate: new Date('2026-07-01T12:00:00.000Z') }),
  ];

  const result = runScript('getProjectsDueForReview.js', projects, { includeOnHold: false }, now);
  assert.deepEqual(result.projects.map((item: any) => item.id), ['earlier', 'later']);
});

test('getProjectsDueForReview respects includeOnHold', () => {
  const now = new Date('2026-07-29T12:00:00.000Z');
  const onHold = project('hold', {
    status: PROJECT_STATUS.OnHold,
    nextReviewDate: new Date('2026-07-01T12:00:00.000Z'),
  });

  assert.equal(runScript('getProjectsDueForReview.js', [onHold], { includeOnHold: false }, now).count, 0);
  assert.equal(runScript('getProjectsDueForReview.js', [onHold], { includeOnHold: true }, now).count, 1);
});
