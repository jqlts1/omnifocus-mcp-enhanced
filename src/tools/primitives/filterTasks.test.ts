import assert from 'node:assert/strict';
import test from 'node:test';
import { applyClientSideFilters } from './filterTasks.js';

function isoWithOffset(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

test('applyClientSideFilters applies exact tag filter', () => {
  const tasks = [
    { id: '1', name: 'watch video', tags: [{ name: 'watching' }] },
    { id: '2', name: 'read article', tags: [{ name: 'reading' }] },
  ];

  const filtered = applyClientSideFilters(tasks as any[], {
    tagFilter: 'watching',
    exactTagMatch: true,
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, '1');
});

test('applyClientSideFilters applies deferToday without including yesterday', () => {
  const tasks = [
    { id: 'today', name: 'today task', deferDate: isoWithOffset(0), tags: [] },
    { id: 'yesterday', name: 'yesterday task', deferDate: isoWithOffset(-1), tags: [] },
  ];

  const filtered = applyClientSideFilters(tasks as any[], {
    deferToday: true,
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'today');
});

test('applyClientSideFilters applies plannedToday without including yesterday', () => {
  const tasks = [
    { id: 'today', name: 'today task', plannedDate: isoWithOffset(0), tags: [] },
    { id: 'yesterday', name: 'yesterday task', plannedDate: isoWithOffset(-1), tags: [] },
  ];

  const filtered = applyClientSideFilters(tasks as any[], {
    plannedToday: true,
  } as any);

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'today');
});

test('applyClientSideFilters applies plannedBefore and plannedAfter window', () => {
  const tasks = [
    { id: 'early', name: 'early task', plannedDate: '2026-02-10T09:00:00.000Z', tags: [] },
    { id: 'in-window', name: 'window task', plannedDate: '2026-02-15T09:00:00.000Z', tags: [] },
    { id: 'late', name: 'late task', plannedDate: '2026-02-22T09:00:00.000Z', tags: [] },
  ];

  const filtered = applyClientSideFilters(tasks as any[], {
    plannedAfter: '2026-02-12',
    plannedBefore: '2026-02-20',
  } as any);

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'in-window');
});
