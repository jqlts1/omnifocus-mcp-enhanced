// Verifies the refresh toggle fires when the edited perspective is on screen.
// OmniFocus does not repaint a displayed perspective after a rule write, so
// this path is the difference between a change taking visible effect or not.
import {
  getPerspective,
  updatePerspective,
} from '../dist/tools/primitives/managePerspectives.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const TARGET = 'think-box';

async function omni(js) {
  const { stdout } = await run('osascript', [
    '-l',
    'JavaScript',
    '-e',
    `Application("OmniFocus").evaluateJavascript(${JSON.stringify(js)})`,
  ]);
  return stdout.trim();
}

const deepCount = `(() => {
  const w = document.windows[0];
  let n = 0;
  const walk = (nd) => { n++; (nd.children||[]).forEach(walk); };
  try { (w.content.rootNode.children||[]).forEach(walk); } catch(e) { return -1; }
  return String(n);
})()`;

const originalView = await omni('document.windows[0].perspective.name');
const original = await getPerspective({ name: TARGET });
let failures = 0;
const check = (l, ok, d = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${l}${d ? ' :: ' + d : ''}`);
  if (!ok) failures += 1;
};

try {
  // Show the target perspective.
  await omni(
    `document.windows[0].perspective = Perspective.Custom.byName(${JSON.stringify(TARGET)}); ""`,
  );
  const shownBefore = Number(await omni(deepCount));
  console.log('nodes displayed before edit:', shownBefore);

  // Apply a rule combination that cannot match anything.
  const result = await updatePerspective({
    name: TARGET,
    rules: {
      match: 'all',
      rules: [
        { type: 'availability', value: 'available' },
        { type: 'availability', value: 'completed' },
      ],
    },
  });
  check('reports the display was refreshed', result.refreshedDisplay === true);

  const shownAfter = Number(await omni(deepCount));
  console.log('nodes displayed after edit:', shownAfter);
  check(
    'the on-screen view actually changed without a manual toggle',
    shownAfter !== shownBefore && shownAfter === 0,
    `${shownBefore} -> ${shownAfter}`,
  );
} finally {
  await updatePerspective({ name: TARGET, rules: original.document });
  const restored = await getPerspective({ name: TARGET });
  const ok =
    JSON.stringify(restored.document) === JSON.stringify(original.document);
  check('original rules restored', ok);
  await omni(
    `(() => { const p = Perspective.Custom.byName(${JSON.stringify(originalView)}) || Perspective.BuiltIn.all.find(b => b.name === ${JSON.stringify(originalView)}); if (p) document.windows[0].perspective = p; return ""; })()`,
  );
  console.log('view restored to:', await omni('document.windows[0].perspective.name'));
}

process.exit(failures === 0 ? 0 : 1);
