import { rm } from 'node:fs/promises';
import { glob } from 'node:fs/promises';

for await (const testFile of glob('dist/**/*.test.js')) {
  await rm(testFile);
}

await Promise.all([
  rm('dist/tools/definitions/getPerspectiveTasksV2.js', { force: true }),
  rm('dist/tools/primitives/getPerspectiveTasksV2.js', { force: true }),
  rm('dist/utils/perspectiveEngine.js', { force: true }),
]);
