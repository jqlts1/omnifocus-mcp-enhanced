import assert from 'node:assert/strict';
import test from 'node:test';
import { schema } from './queryOmnifocus.js';

// Schema validation tests for new text search filters

test('query_omnifocus schema accepts nameContains filter', () => {
  const parsed = schema.parse({
    entity: 'tasks',
    filters: { nameContains: 'compression' }
  }) as any;

  assert.equal(parsed.filters.nameContains, 'compression');
});

test('query_omnifocus schema accepts noteContains filter', () => {
  const parsed = schema.parse({
    entity: 'tasks',
    filters: { noteContains: 'session context' }
  }) as any;

  assert.equal(parsed.filters.noteContains, 'session context');
});

test('query_omnifocus schema accepts keyword filter', () => {
  const parsed = schema.parse({
    entity: 'tasks',
    filters: { keyword: 'GTD' }
  }) as any;

  assert.equal(parsed.filters.keyword, 'GTD');
});

test('query_omnifocus schema accepts all three text filters together', () => {
  const parsed = schema.parse({
    entity: 'projects',
    filters: { nameContains: 'work', noteContains: 'deadline', keyword: 'urgent' }
  }) as any;

  assert.equal(parsed.filters.nameContains, 'work');
  assert.equal(parsed.filters.noteContains, 'deadline');
  assert.equal(parsed.filters.keyword, 'urgent');
});

test('query_omnifocus schema accepts text filters combined with existing filters', () => {
  const parsed = schema.parse({
    entity: 'tasks',
    filters: { nameContains: 'review', flagged: true, status: ['Available'] }
  }) as any;

  assert.equal(parsed.filters.nameContains, 'review');
  assert.equal(parsed.filters.flagged, true);
  assert.deepEqual(parsed.filters.status, ['Available']);
});
