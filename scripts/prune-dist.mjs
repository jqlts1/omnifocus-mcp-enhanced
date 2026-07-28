import { rm } from 'node:fs/promises';
import { glob } from 'node:fs/promises';

for await (const testFile of glob('dist/**/*.test.js')) {
  await rm(testFile);
}
