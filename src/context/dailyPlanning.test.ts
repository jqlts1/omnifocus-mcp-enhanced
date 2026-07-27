import assert from 'node:assert/strict';
import test from 'node:test';
import { collectDailyPlanningData, compactDailyCandidate } from './dailyPlanning.js';

test('daily planning collects exact counts and deduplicates candidates by ID', async () => {
  const seenLimits: number[] = [];
  const result = await collectDailyPlanningData(12, {
    count: async options => ({ total: options.flagged ? 2 : 1, byStatus: {} }),
    fetch: async (options, limit) => {
      seenLimits.push(limit);
      if (options.overdue) return [{ id: 'shared', name: 'Shared', note: 'secret' }];
      if (options.flagged) return [{ id: 'shared', name: 'Shared' }, { id: 'flag', name: 'Flag' }];
      return [];
    },
  });

  assert.equal(result.counts.flagged.total, 2);
  assert.equal(result.candidates.length, 2);
  assert.deepEqual(result.candidates.find(task => task.id === 'shared')?.sources, ['overdue', 'flagged']);
  assert.deepEqual(seenLimits, [12, 12, 12, 12]);
});

test('daily planning sorts bounded source reads by their risk date', async () => {
  const options: any[] = [];
  await collectDailyPlanningData(10, {
    count: async () => ({ total: 0, byStatus: {} }),
    fetch: async filter => {
      options.push(filter);
      return [];
    },
  });

  assert.deepEqual(options.map(option => [option.sortBy, option.sortOrder]), [
    ['dueDate', 'asc'],
    ['dueDate', 'asc'],
    ['plannedDate', 'asc'],
    ['dueDate', 'asc'],
  ]);
});

test('daily planning treats count failures as fatal', async () => {
  await assert.rejects(
    collectDailyPlanningData(10, {
      count: async options => {
        if (options.dueToday) throw new Error('due count unavailable');
        return { total: 0, byStatus: {} };
      },
      fetch: async () => [],
    }),
    /due count unavailable/,
  );
});

test('daily planning reports detail failures and keeps other sources', async () => {
  const result = await collectDailyPlanningData(10, {
    count: async () => ({ total: 1, byStatus: {} }),
    fetch: async options => {
      if (options.plannedToday) throw new Error('planned details unavailable');
      if (options.dueToday) return [{ id: 'due', name: 'Due' }];
      return [];
    },
  });

  assert.deepEqual(result.missingDetailSources, ['plannedToday']);
  assert.deepEqual(result.candidates.map(task => task.id), ['due']);
});

test('daily planning reports successful detail reads truncated by their bound', async () => {
  const result = await collectDailyPlanningData(1, {
    count: async options => ({ total: options.overdue ? 2 : 0, byStatus: {} }),
    fetch: async options => options.overdue ? [{ id: 'first', name: 'First' }] : [],
  });

  assert.deepEqual(result.truncatedDetailSources, ['overdue']);
});

test('compact daily candidates omit notes and tags but keep planning fields', () => {
  const compact = compactDailyCandidate({
    id: 'task-1',
    name: 'Plan',
    note: 'secret',
    tags: [{ id: 'tag-1', name: 'private' }],
    taskStatus: 'Available',
    projectName: 'Work',
    parentId: 'parent-1',
    dueDate: '2026-07-27T10:00:00.000Z',
    plannedDate: '2026-07-27T09:00:00.000Z',
    estimatedMinutes: 30,
    childrenCount: 2,
    sources: ['dueToday'],
  });

  assert.equal(compact.id, 'task-1');
  assert.equal(compact.childrenCount, 2);
  assert.equal(compact.parentId, 'parent-1');
  assert.equal('note' in compact, false);
  assert.equal('tags' in compact, false);
});
