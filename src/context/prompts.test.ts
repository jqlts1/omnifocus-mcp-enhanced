import assert from 'node:assert/strict';
import test from 'node:test';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  buildDailyReviewPrompt,
  buildProjectShapingPrompt,
  registerPrompts,
} from './prompts.js';
import type { ZodType } from 'zod';

type CapturedPrompt = [
  string,
  { argsSchema?: { availableMinutes?: ZodType<number | undefined> } },
  unknown,
];

test('daily_review exposes optional positive availableMinutes', () => {
  const captured: CapturedPrompt[] = [];
  const server = {
    registerPrompt: (...args: CapturedPrompt) => captured.push(args),
  } as unknown as McpServer;

  registerPrompts(server);
  const daily = captured.find((args) => args[0] === 'daily_review');
  assert.ok(daily);
  const schema = daily[1].argsSchema?.availableMinutes;
  assert.ok(schema);
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
    candidates: [
      {
        id: 'task-1',
        name: 'Important task',
        taskStatus: 'Available',
        estimatedMinutes: null,
        sources: ['dueToday'],
      },
    ],
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

test('project shaping prompt separates proposal, confirmation, and action', () => {
  const prompt = buildProjectShapingPrompt();

  assert.match(prompt, /meeting notes, brainstorm, or task list/);
  assert.match(prompt, /clearly label every inferred/);
  assert.match(prompt, /manage_folders --action list or manage_tags --action list/);
  assert.match(prompt, /stable id/);
  assert.match(prompt, /explicit confirmation immediately before creation/);
  assert.match(prompt, /create_project_from_outline once/);
  assert.match(prompt, /never put raw meeting notes/);
  assert.match(prompt, /ROLLBACK_UNCONFIRMED/);
  assert.match(prompt, /200 tasks and eight task levels/);
  assert.match(prompt, /repetition on tasks/);
  assert.match(prompt, /FREQ=WEEKLY;BYDAY=FR/);
  assert.match(prompt, /next occurrence/);
});

test('registerPrompts exposes project_shaping as the fifth prompt', () => {
  const captured: CapturedPrompt[] = [];
  const server = {
    registerPrompt: (...args: CapturedPrompt) => captured.push(args),
  } as unknown as McpServer;

  registerPrompts(server);
  assert.equal(captured.length, 6);
  assert.ok(captured.some((args) => args[0] === 'project_shaping'));
  assert.ok(captured.some((args) => args[0] === 'task_health_scan'));
});
