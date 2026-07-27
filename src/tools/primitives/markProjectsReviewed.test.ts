import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const STATUS = {
  Active: 'ACTIVE',
  OnHold: 'ON_HOLD',
  Done: 'DONE',
  Dropped: 'DROPPED',
};

interface FakeProject {
  id: { primaryKey: string };
  task: { id: { primaryKey: string } };
  name: string;
  status: string;
  reviewInterval: { steps: number; unit: string; fixed: boolean } | null;
  nextReviewDate: Date | null;
  lastReviewDate: Date | null;
}

function project(id: string, options: Partial<FakeProject> & { failReviewOnce?: boolean } = {}): FakeProject {
  let lastReviewDate = options.lastReviewDate || new Date('2026-07-01T12:00:00.000Z');
  let reviewFailurePending = options.failReviewOnce === true;
  const interval = options.reviewInterval === undefined
    ? { steps: 1, unit: 'weeks', fixed: false }
    : options.reviewInterval;
  const value: FakeProject = {
    id: { primaryKey: id },
    task: { id: { primaryKey: `root-${id}` } },
    name: options.name || id,
    status: options.status || STATUS.Active,
    reviewInterval: interval,
    nextReviewDate: options.nextReviewDate || new Date('2026-07-08T12:00:00.000Z'),
    get lastReviewDate() { return lastReviewDate; },
    set lastReviewDate(date: Date | null) {
      if (date && reviewFailurePending) {
        reviewFailurePending = false;
        throw new Error('simulated review write failure');
      }
      lastReviewDate = date;
      if (date && interval) {
        this.nextReviewDate = new Date(date.getTime() + interval.steps * 7 * 24 * 60 * 60 * 1000);
      }
    },
  };
  return value;
}

function runReview(projectIds: string[], projects: FakeProject[], now = new Date('2026-07-27T12:00:00.000Z')): any {
  const script = readFileSync(
    new URL('../../utils/omnifocusScripts/markProjectsReviewed.js', import.meta.url),
    'utf8',
  );

  class FixedDate extends Date {
    constructor(...values: any[]) {
      if (values.length === 0) super(now.getTime());
      else if (values.length === 1) super(values[0]);
      else super(values[0], values[1], values[2] ?? 1, values[3] ?? 0, values[4] ?? 0, values[5] ?? 0, values[6] ?? 0);
    }
  }

  const result = vm.runInNewContext(script, {
    injectedArgs: { projectIds },
    flattenedProjects: projects,
    Project: { Status: STATUS },
    Date: FixedDate,
    Number,
    String,
    Set,
    Array,
    JSON,
  });
  return JSON.parse(result);
}

test('mark projects reviewed uses one timestamp and verifies next dates', () => {
  const first = project('first');
  const second = project('second', { status: STATUS.OnHold });
  const result = runReview(['first', 'second'], [first, second]);

  assert.equal(result.success, true);
  assert.equal(result.count, 2);
  assert.equal(result.projects[0].lastReviewDate, result.projects[1].lastReviewDate);
  assert.equal(result.projects.every((item: any) => item.verified), true);
  assert.equal(first.reviewInterval?.steps, 1);
});

test('mark projects reviewed preflights all projects before changing any date', () => {
  const first = project('first');
  const original = first.lastReviewDate?.toISOString();
  const done = project('done', { status: STATUS.Done });

  const result = runReview(['first', 'done'], [first, done]);
  assert.equal(result.success, false);
  assert.match(result.error, /not eligible/);
  assert.equal(first.lastReviewDate?.toISOString(), original);
});

test('mark projects reviewed rejects missing review intervals', () => {
  const missingInterval = project('missing', { reviewInterval: null });
  const result = runReview(['missing'], [missingInterval]);

  assert.equal(result.success, false);
  assert.match(result.error, /no usable review interval/);
});

test('mark projects reviewed resolves AppleScript root task project IDs', () => {
  const first = project('first');
  const result = runReview(['root-first'], [first]);

  assert.equal(result.success, true);
  assert.equal(result.projects[0].id, 'root-first');
});

test('mark projects reviewed restores earlier dates when a write fails', () => {
  const first = project('first');
  const second = project('second', { failReviewOnce: true });
  const firstOriginal = first.lastReviewDate?.toISOString();
  const secondOriginal = second.lastReviewDate?.toISOString();

  const result = runReview(['first', 'second'], [first, second]);
  assert.equal(result.success, false);
  assert.match(result.error, /Previous review dates were restored/);
  assert.equal(first.lastReviewDate?.toISOString(), firstOriginal);
  assert.equal(second.lastReviewDate?.toISOString(), secondOriginal);
});
