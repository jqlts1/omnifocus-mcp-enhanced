import { cp, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const source = 'src/utils/omnifocusScripts';
const destination = 'dist/utils/omnifocusScripts';
const scripts = [
  'applyTagsExclusive.js',
  'batchCompleteTasks.js',
  'batchMoveTasks.js',
  'batchRemoveItems.js',
  'createProjectFromOutline.js',
  'duplicateTask.js',
  'filterTasks.js',
  'flaggedTasks.js',
  'forecastTasks.js',
  'getCustomPerspectiveTasks.js',
  'getFolder.js',
  'getProjects.js',
  'getProjectsDueForReview.js',
  'getTaskById.js',
  'inboxTasks.js',
  'listCustomPerspectives.js',
  'listFolders.js',
  'listProjects.js',
  'listTags.js',
  'markProjectsReviewed.js',
  'omnifocusDump.js',
  'readTaskAttachment.js',
  'setRepetitionRule.js',
  'taskNotifications.js',
  'tasksByTag.js',
  'taskTreeHelpers.js',
  'todayCompletedTasks.js',
];

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await Promise.all(
  scripts.map((script) => cp(join(source, script), join(destination, script))),
);
