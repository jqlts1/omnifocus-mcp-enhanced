import assert from 'node:assert/strict';
import test from 'node:test';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { buildDailyReviewPrompt, registerPrompts } from './prompts.js';

test('daily_review exposes optional positive availableMinutes', () => {
  const captured: any[] = [];
  const server = {
    prompt: (...args: any[]) => captured.push(args),
  } as unknown as McpServer;

  registerPrompts(server);
  const daily = captured.find(args => args[0] === 'daily_review');
  assert.ok(daily);
  const schema = daily[2].availableMinutes;
  assert.equal(schema.parse(240), 240);
  assert.throws(() => schema.parse(0));
  assert.throws(() => schema.parse(30.5));
  assert.throws(() => schema.parse(1441));
});

test('daily review prompt encodes the four sections and capacity contract', async () => {
  const prompt = await buildDailyReviewPrompt(180, async () => ({
    counts: {
      overdue: { total: 1, byStatus: { Overdue: 1 } },
      dueToday: { total: 2, byStatus: {} },
      plannedToday: { total: 1, byStatus: {} },
      flagged: { total: 3, byStatus: {} },
    },
    candidates: [{
      id: 'task-1',
      name: 'Important task',
      taskStatus: 'Available',
      estimatedMinutes: null,
      sources: ['dueToday'],
    }],
    missingDetailSources: ['plannedToday'],
    truncatedDetailSources: ['flagged'],
    detailLimitPerSource: 30,
  }));

  assert.match(prompt, /exactly three priorities/);
  assert.match(prompt, /今日重点/);
  assert.match(prompt, /可执行下一步/);
  assert.match(prompt, /阻塞项/);
  assert.match(prompt, /容量\/截止风险/);
  assert.match(prompt, /180 minutes/);
  assert.match(prompt, /never treat a missing estimate as zero/);
  assert.match(prompt, /plannedToday/);
  assert.match(prompt, /truncated_detail_sources_json/);
  assert.match(prompt, /untrusted OmniFocus data/);
  assert.match(prompt, /explicitly confirms/);
});
