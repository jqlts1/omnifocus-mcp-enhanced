import assert from 'node:assert/strict';
import test from 'node:test';

import { parseListFoldersResult } from './listFolders.js';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('parseListFoldersResult preserves hierarchy and project counts', () => {
  const result = parseListFoldersResult(JSON.stringify({
    success: true,
    count: 2,
    folders: [
      { id: 'root', name: 'Work', parentFolderID: null, status: 'active', projectCount: 3 },
      { id: 'child', name: 'Clients', parentFolderID: 'root', status: 'active', projectCount: 1 }
    ]
  }));

  assert.equal(result.count, 2);
  assert.equal(result.folders[1].parentFolderID, 'root');
  assert.equal(result.folders[0].projectCount, 3);
});

test('parseListFoldersResult rejects malformed responses', () => {
  assert.throws(
    () => parseListFoldersResult({ success: true, folders: null }),
    /folders must be an array/
  );
  assert.throws(
    () => parseListFoldersResult({ success: false, error: 'OmniFocus unavailable' }),
    /OmniFocus unavailable/
  );
});

test('listFolders OmniJS includes dropped folders by default and preserves hierarchy', () => {
  const script = readFileSync(
    new URL('../../utils/omnifocusScripts/listFolders.js', import.meta.url),
    'utf8'
  );
  const parent = {
    id: { primaryKey: 'root' },
    name: 'Work',
    parent: null,
    status: 'active',
    projects: [{}, {}]
  };
  const child = {
    id: { primaryKey: 'child' },
    name: 'Dropped Clients',
    parent,
    status: 'dropped',
    projects: [{}]
  };
  const result = vm.runInNewContext(script, {
    includeDropped: true,
    flattenedFolders: [parent, child]
  });
  const parsed = JSON.parse(result);

  assert.equal(parsed.count, 2);
  assert.equal(parsed.folders[0].projectCount, 2);
  assert.equal(parsed.folders[1].parentFolderID, 'root');
  assert.equal(parsed.folders[1].status, 'dropped');
});

test('listFolders OmniJS can exclude dropped folders', () => {
  const script = readFileSync(
    new URL('../../utils/omnifocusScripts/listFolders.js', import.meta.url),
    'utf8'
  );
  const result = vm.runInNewContext(script, {
    includeDropped: false,
    flattenedFolders: [
      { id: { primaryKey: 'active' }, name: 'Work', parent: null, status: 'active', projects: [] },
      { id: { primaryKey: 'dropped' }, name: 'Old', parent: null, status: 'dropped', projects: [] }
    ]
  });

  assert.deepEqual(
    JSON.parse(result).folders.map((folder: { id: string }) => folder.id),
    ['active']
  );
});
