import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function runPerspectiveScript(changeDuringRead = false) {
  const script = readFileSync(
    new URL(
      '../../utils/omnifocusScripts/getCustomPerspectiveTasks.js',
      import.meta.url,
    ),
    'utf8',
  );
  class FakeTask {}
  const originalPerspective = { identifier: 'original' };
  const targetPerspective = { identifier: 'target' };
  const userPerspective = { identifier: 'user' };
  const window = {
    perspective: originalPerspective,
    content: {
      get rootNode() {
        if (changeDuringRead) window.perspective = userPerspective;
        return { children: [] };
      },
    },
  };
  const result = vm.runInNewContext(script, {
    injectedArgs: { perspectiveName: 'Today' },
    Perspective: { Custom: { byName: () => targetPerspective } },
    document: { windows: [window] },
    Task: FakeTask,
  });

  return {
    result: JSON.parse(result),
    window,
    originalPerspective,
    userPerspective,
  };
}

test('custom perspective reads restore the original window perspective', () => {
  const { result, window, originalPerspective } = runPerspectiveScript();
  assert.equal(result.success, true);
  assert.equal(window.perspective, originalPerspective);
});

test('custom perspective reads preserve a user perspective change during collection', () => {
  const { result, window, userPerspective } = runPerspectiveScript(true);
  assert.equal(result.success, true);
  assert.equal(window.perspective, userPerspective);
});
