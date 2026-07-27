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
      ...countResult(result),
      responseBytes,
    };
  } catch {
    return {
      name,
      ok: false,
      elapsedMs: Math.round((performance.now() - startedAt) * 100) / 100,
      fullMatchCount: null,
      pageCount: null,
      hasMore: null,
      responseBytes: 0,
    };
  }
}

async function measureFilterPages() {
  const pageRows = [];
  const firstStartedAt = performance.now();
  try {
    const first = await filterTasks({ limit: 2, sortBy: 'name', outputMode: 'compact' });
    pageRows.push({
      name: 'filter_compact_page_1',
      ok: true,
      elapsedMs: Math.round((performance.now() - firstStartedAt) * 100) / 100,
      ...textMetrics(first),
      responseBytes: Buffer.byteLength(first, 'utf8'),
    });
    const cursor = first.match(/Next cursor: (\S+)/)?.[1];
    if (cursor) {
      const nextStartedAt = performance.now();
      const second = await filterTasks({ limit: 2, sortBy: 'name', outputMode: 'compact', cursor });
      pageRows.push({
        name: 'filter_compact_page_2',
        ok: true,
        elapsedMs: Math.round((performance.now() - nextStartedAt) * 100) / 100,
        ...textMetrics(second),
        responseBytes: Buffer.byteLength(second, 'utf8'),
      });
    }
    const detailedStartedAt = performance.now();
    const detailed = await filterTasks({ limit: 2, sortBy: 'name', outputMode: 'detailed' });
    pageRows.push({
      name: 'filter_detailed_page_1',
      ok: true,
      elapsedMs: Math.round((performance.now() - detailedStartedAt) * 100) / 100,
      ...textMetrics(detailed),
      responseBytes: Buffer.byteLength(detailed, 'utf8'),
    });
  } catch {
    pageRows.push({
      name: pageRows.length === 0 ? 'filter_compact_page_1' : 'filter_compact_page_2',
      ok: false,
      elapsedMs: Math.round((performance.now() - firstStartedAt) * 100) / 100,
      fullMatchCount: null,
      pageCount: null,
      hasMore: null,
      responseBytes: 0,
    });
  }
  return pageRows;
}

const textCount = text => {
  const match = String(text).match(/(?:Found|📥 Found) (\d+)/);
  if (match) return Number(match[1]);
  return (String(text).match(/\[\d+ subtasks?\]/g) || []).length;
};

const textMetrics = text => {
  const full = String(text).match(/(?:of|page of) (\d+)(?:\)| current matches)/);
  const page = String(text).match(/Page: (\d+) tasks?/);
  return {
    fullMatchCount: full ? Number(full[1]) : textCount(text),
    pageCount: page ? Number(page[1]) : textCount(text),
    hasMore: String(text).includes('More results available.'),
  };
};

const aggregateMetrics = result => ({
  fullMatchCount: result.total,
  pageCount: result.total,
  hasMore: false,
});

const rows = [];
rows.push(await measure(
  'count_flagged',
  () => countTasks({ flagged: true }),
  aggregateMetrics,
));
rows.push(...await measureFilterPages());
rows.push(await measure(
  'inbox',
  () => getInboxTasks({ showSubtasks: false }),
  textMetrics,
));
rows.push(await measure(
  'forecast',
  () => getForecastTasks({ days: 7, showSubtasks: false }),
  textMetrics,
));
rows.push(await measure(
  'inbox_tree_depth_2',
  () => getInboxTasks({ showSubtasks: true, maxSubtaskDepth: 2 }),
  textMetrics,
));

// Numeric summaries only: never emit task content, names, IDs, notes, or tags.
process.stdout.write(`${JSON.stringify({ benchmarkVersion: 2, rows }, null, 2)}\n`);
if (rows.some(row => !row.ok)) process.exitCode = 1;
