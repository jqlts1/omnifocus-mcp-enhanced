import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

import { getForecastDateCategory, parseLocalDateKey } from './getForecastTasks.js';

test('parseLocalDateKey preserves local calendar components', () => {
  const date = parseLocalDateKey('2026-06-20');

  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 5);
  assert.equal(date.getDate(), 20);
  assert.equal(date.getHours(), 0);
});

test('parseLocalDateKey rejects invalid calendar dates', () => {
  assert.throws(() => parseLocalDateKey('2026-02-30'), /Invalid forecast date/);
  assert.throws(() => parseLocalDateKey('06/20/2026'), /Invalid forecast date/);
});

test('getForecastDateCategory uses calendar-day arithmetic across DST', () => {
  const now = new Date(2026, 2, 7, 12);
  const tomorrow = new Date(2026, 2, 8);

  assert.equal(getForecastDateCategory(tomorrow, now), 'tomorrow');
  assert.equal(getForecastDateCategory(new Date(2026, 2, 7), now), 'today');
  assert.equal(getForecastDateCategory(new Date(2026, 2, 6), now), 'overdue');
  assert.equal(getForecastDateCategory(new Date(2026, 2, 9), now), 'future');
});

test('forecast OmniJS groups tasks by their local calendar date', () => {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 1);
  dueDate.setHours(12, 0, 0, 0);
  const expectedKey = [
    dueDate.getFullYear(),
    String(dueDate.getMonth() + 1).padStart(2, '0'),
    String(dueDate.getDate()).padStart(2, '0')
  ].join('-');
  const script = readFileSync(
    new URL('../../utils/omnifocusScripts/forecastTasks.js', import.meta.url),
    'utf8'
  );
  const taskStatus = {
    Available: 'available',
    Blocked: 'blocked',
    Completed: 'completed',
    Dropped: 'dropped',
    DueSoon: 'dueSoon',
    Next: 'next',
    Overdue: 'overdue'
  };
  const result = vm.runInNewContext(script, {
    days: 7,
    hideCompleted: true,
    includeDeferredOnly: false,
    Task: { Status: taskStatus },
    flattenedTasks: [{
      id: { primaryKey: 'task-1' },
      name: 'Local date task',
      note: '',
      taskStatus: taskStatus.Available,
      flagged: false,
      dueDate,
      deferDate: null,
      plannedDate: null,
      estimatedMinutes: null,
      containingProject: null,
      inInbox: true,
      tags: []
    }],
    console: { log() {}, error() {} }
  });
  const parsed = JSON.parse(result);

  assert.deepEqual(Object.keys(parsed.tasksByDate), [expectedKey]);
});
