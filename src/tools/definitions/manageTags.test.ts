import assert from 'node:assert/strict';
import test from 'node:test';
import { createHandler, schema } from './manageTags.js';

const extra = undefined as never;

function stubDependencies() {
  const calls: Array<{ method: string; args: unknown }> = [];
  return {
    calls,
    dependencies: {
      listTags: async (includeInactive?: boolean) => {
        calls.push({ method: 'list', args: includeInactive });
        return 'tag list';
      },
      searchTags: async (args: unknown) => {
        calls.push({ method: 'search', args });
        return 'tag search';
      },
      addTag: async (args: unknown) => {
        calls.push({ method: 'add', args });
        return { success: true, tagId: 'tag-2', name: 'Deep Work' };
      },
      editTag: async (args: unknown) => {
        calls.push({ method: 'edit', args });
        return {
          success: true,
          id: 'tag-1',
          name: 'Focus',
          changedProperties: 'name, parent',
        };
      },
      removeTag: async (args: unknown) => {
        calls.push({ method: 'remove', args });
        return {
          success: true,
          name: 'Obsolete',
          affectedTaskCount: 3,
          childTagCount: 1,
        };
      },
    },
  };
}

test('manage_tags schema enforces action contracts', () => {
  assert.equal(schema.safeParse({ action: 'search' }).success, false);
  assert.equal(schema.safeParse({ action: 'add' }).success, false);
  assert.equal(schema.safeParse({ action: 'edit', id: 'tag-1' }).success, false);
  assert.equal(
    schema.safeParse({ action: 'edit', id: 'tag-1', newParentTagName: '' })
      .success,
    true,
  );
  assert.equal(
    schema.safeParse({ action: 'list', query: 'Work' }).success,
    false,
  );
});

test('manage_tags routes operations and preserves edit parent naming', async () => {
  const { calls, dependencies } = stubDependencies();
  const handler = createHandler(dependencies);

  await handler({ action: 'list', includeInactive: false }, extra);
  await handler(
    { action: 'search', query: 'work', exactMatch: true },
    extra,
  );
  await handler(
    { action: 'add', name: 'Deep Work', parentTagName: 'Contexts' },
    extra,
  );
  await handler(
    {
      action: 'edit',
      id: 'tag-1',
      newName: 'Focus',
      newParentTagName: '',
    },
    extra,
  );
  const removeResult = await handler(
    { action: 'remove', name: 'Obsolete' },
    extra,
  );

  assert.match(removeResult.content[0].text, /removed from 3 task\(s\)/);
  assert.match(removeResult.content[0].text, /deleted 1 child tag\(s\)/);
  assert.deepEqual(calls, [
    { method: 'list', args: false },
    {
      method: 'search',
      args: { query: 'work', exactMatch: true, includeInactive: undefined },
    },
    {
      method: 'add',
      args: { name: 'Deep Work', parentTagName: 'Contexts' },
    },
    {
      method: 'edit',
      args: {
        id: 'tag-1',
        name: undefined,
        newName: 'Focus',
        newStatus: undefined,
        newParentTagName: '',
      },
    },
    { method: 'remove', args: { id: undefined, name: 'Obsolete' } },
  ]);
});

test('manage_tags rejects invalid arguments before mutation', async () => {
  const { calls, dependencies } = stubDependencies();
  const handler = createHandler(dependencies);

  const result = await handler({ action: 'edit', name: 'Work' }, extra);

  assert.equal('isError' in result && result.isError, true);
  assert.match(result.content[0].text, /newName, newStatus, or newParentTagName/);
  assert.deepEqual(calls, []);
});
