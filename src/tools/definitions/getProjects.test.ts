import assert from 'node:assert/strict';
import test from 'node:test';
import { createHandler, schema } from './getProjects.js';

const extra = undefined as never;

test('get_projects schema separates all and review views', () => {
  assert.equal(schema.safeParse({ status: ['Active'] }).success, true);
  assert.equal(
    schema.safeParse({ view: 'due_for_review', includeOnHold: true }).success,
    true,
  );
  assert.equal(
    schema.safeParse({ view: 'due_for_review', folderName: 'Work' }).success,
    false,
  );
  assert.equal(schema.safeParse({ includeOnHold: true }).success, false);
});

test('get_projects routes project views with normalized defaults', async () => {
  const calls: Array<{ method: string; args: unknown }> = [];
  const handler = createHandler({
    getProjects: async (args) => {
      calls.push({ method: 'all', args });
      return 'all projects';
    },
    getProjectsDueForReview: async (args) => {
      calls.push({ method: 'review', args });
      return 'review projects';
    },
  });

  const allResult = await handler({ folderName: 'Work' }, extra);
  const reviewResult = await handler(
    { view: 'due_for_review', includeOnHold: true },
    extra,
  );

  assert.equal(allResult.content[0].text, 'all projects');
  assert.equal(reviewResult.content[0].text, 'review projects');
  assert.deepEqual(calls, [
    {
      method: 'all',
      args: {
        status: undefined,
        folderName: 'Work',
        includeReviewData: true,
      },
    },
    { method: 'review', args: { includeOnHold: true } },
  ]);
});
