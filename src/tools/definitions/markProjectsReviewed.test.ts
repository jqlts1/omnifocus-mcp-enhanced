import assert from 'node:assert/strict';
import test from 'node:test';
import { schema } from './markProjectsReviewed.js';

test('mark_projects_reviewed accepts a simple list of stable IDs', () => {
  const parsed = schema.parse({ projectIds: ['project-1', 'project-2'] });
  assert.deepEqual(parsed.projectIds, ['project-1', 'project-2']);
});

test('mark_projects_reviewed rejects duplicate IDs', () => {
  assert.throws(
    () => schema.parse({ projectIds: ['project-1', 'project-1'] }),
    /Duplicate project ID/,
  );
});

test('mark_projects_reviewed rejects extra controls', () => {
  assert.throws(() => schema.parse({
    projectIds: ['project-1'],
    verify: false,
  }));
});
