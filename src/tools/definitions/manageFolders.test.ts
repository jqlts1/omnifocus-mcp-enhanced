import assert from 'node:assert/strict';
import test from 'node:test';
import { createHandler, schema } from './manageFolders.js';

const extra = undefined as never;

function stubDependencies() {
  const calls: Array<{ method: string; args: unknown }> = [];
  return {
    calls,
    dependencies: {
      listFolders: async (includeDropped?: boolean) => {
        calls.push({ method: 'list', args: includeDropped });
        return 'folder list';
      },
      getFolder: async (args: unknown) => {
        calls.push({ method: 'get', args });
        return {
          id: 'folder-1',
          name: 'Work',
          status: 'active',
          parentFolderID: null,
          subfolders: [],
          projects: [],
        };
      },
      addFolder: async (args: unknown) => {
        calls.push({ method: 'add', args });
        return { success: true, folderId: 'folder-2', name: 'Archive' };
      },
      editFolder: async (args: unknown) => {
        calls.push({ method: 'edit', args });
        return {
          success: true,
          id: 'folder-1',
          name: 'Focused Work',
          changedProperties: 'name',
        };
      },
      removeFolder: async (args: unknown) => {
        calls.push({ method: 'remove', args });
        return {
          success: true,
          name: 'Archive',
          deletedProjectCount: 2,
          deletedTaskCount: 4,
        };
      },
    },
  };
}

test('manage_folders schema enforces action contracts', () => {
  assert.equal(schema.safeParse({ action: 'add' }).success, false);
  assert.equal(schema.safeParse({ action: 'edit', id: 'folder-1' }).success, false);
  assert.equal(
    schema.safeParse({ action: 'edit', id: 'folder-1', newParentFolderName: '' })
      .success,
    true,
  );
  assert.equal(
    schema.safeParse({ action: 'list', name: 'Work' }).success,
    false,
  );
});

test('manage_folders routes operations and preserves edit parent naming', async () => {
  const { calls, dependencies } = stubDependencies();
  const handler = createHandler(dependencies);

  await handler({ action: 'list', includeDropped: false }, extra);
  const getResult = await handler({ action: 'get', id: 'folder-1' }, extra);
  await handler(
    { action: 'add', name: 'Archive', parentFolderName: 'Work' },
    extra,
  );
  await handler(
    {
      action: 'edit',
      id: 'folder-1',
      newName: 'Focused Work',
      newParentFolderName: '',
    },
    extra,
  );
  const removeResult = await handler(
    { action: 'remove', name: 'Archive' },
    extra,
  );

  assert.match(getResult.content[0].text, /# Folder: Work/);
  assert.match(removeResult.content[0].text, /2 contained project\(s\)/);
  assert.match(removeResult.content[0].text, /4 task\(s\)/);
  assert.deepEqual(calls, [
    { method: 'list', args: false },
    { method: 'get', args: { id: 'folder-1', name: undefined } },
    {
      method: 'add',
      args: { name: 'Archive', parentFolderName: 'Work' },
    },
    {
      method: 'edit',
      args: {
        id: 'folder-1',
        name: undefined,
        newName: 'Focused Work',
        newParentFolderName: '',
      },
    },
    { method: 'remove', args: { id: undefined, name: 'Archive' } },
  ]);
});

test('manage_folders rejects invalid arguments before mutation', async () => {
  const { calls, dependencies } = stubDependencies();
  const handler = createHandler(dependencies);

  const result = await handler({ action: 'remove' }, extra);

  assert.equal('isError' in result && result.isError, true);
  assert.match(result.content[0].text, /id or name is required/);
  assert.deepEqual(calls, []);
});
