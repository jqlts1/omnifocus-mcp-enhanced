import { Buffer } from 'node:buffer';
import { countTasks } from '../dist/tools/primitives/countTasks.js';
import { filterTasks } from '../dist/tools/primitives/filterTasks.js';
import { getInboxTasks } from '../dist/tools/primitives/getInboxTasks.js';
import { getForecastTasks } from '../dist/tools/primitives/getForecastTasks.js';

async function measure(name, run, countResult) {
  const startedAt = performance.now();
  try {
    const result = await run();
    const elapsedMs = Math.round((performance.now() - startedAt) * 100) / 100;
    const responseBytes = typeof result === 'string'
      ? Buffer.byteLength(result, 'utf8')
      : Buffer.byteLength(JSON.stringify(result), 'utf8');
    return {
      name,
      ok: true,
      elapsedMs,
      resultCount: countResult(result),
      responseBytes,
    };
  } catch {
    return {
      name,
      ok: false,
      elapsedMs: Math.round((performance.now() - startedAt) * 100) / 100,
      resultCount: null,
      responseBytes: 0,
    };
  }
}

const textCount = text => {
  const match = String(text).match(/(?:Found|📥 Found) (\d+)/);
  if (match) return Number(match[1]);
  return (String(text).match(/\[\d+ subtasks?\]/g) || []).length;
};

const rows = [];
rows.push(await measure(
  'count_overdue',
  () => countTasks({ overdue: true }),
  result => result.total,
));
rows.push(await measure(
  'count_flagged',
  () => countTasks({ flagged: true }),
  result => result.total,
));
rows.push(await measure(
  'filter_planned_compact',
  () => filterTasks({ plannedToday: true, limit: 30, outputMode: 'compact' }),
  textCount,
));
rows.push(await measure(
  'inbox',
  () => getInboxTasks({ showSubtasks: false }),
  textCount,
));
rows.push(await measure(
  'forecast',
  () => getForecastTasks({ days: 7, showSubtasks: false }),
  textCount,
));
rows.push(await measure(
  'inbox_tree_depth_2',
  () => getInboxTasks({ showSubtasks: true, maxSubtaskDepth: 2 }),
  textCount,
));

// Numeric summaries only: never emit task content, names, IDs, notes, or tags.
process.stdout.write(`${JSON.stringify({ benchmarkVersion: 1, rows }, null, 2)}\n`);
if (rows.some(row => !row.ok)) process.exitCode = 1;
